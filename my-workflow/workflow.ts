import {
	bigintToProtoBigInt,
	bytesToBigint,
	bytesToHex,
	cre,
	getNetwork,
	hexToBase64,
	type HTTPPayload,
	LAST_FINALIZED_BLOCK_NUMBER,
	type Runtime,
	TxStatus,
	encodeCallMsg,
	protoBigIntToBigint,
} from '@chainlink/cre-sdk'
import {
	type Address,
	decodeFunctionResult,
	encodeAbiParameters,
	encodeFunctionData,
	formatUnits,
	keccak256,
	toBytes,
	zeroAddress,
} from 'viem'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const configSchema = z.object({
	// Chain selector name, e.g. "ethereum-testnet-sepolia".
	chainName: z.string(),
	// Deployed Snapshot consumer contract that receives the write.
	snapshotAddress: z.string(),
	// Gas limit for the onchain write.
	gasLimit: z.string().default('500000'),
	// How many blocks to look back when locating the feed's last AnswerUpdated event.
	answerUpdatedLookbackBlocks: z.number().int().positive().default(7200),
	// Map of token symbol -> Chainlink Data Feed proxy address (Sepolia).
	feeds: z.record(z.string(), z.string()),
})

type Config = z.infer<typeof configSchema>

// Body accepted by the HTTP trigger, e.g. { "token": "ETH" }.
const requestSchema = z.object({ token: z.string().min(1) })

// Structured result returned by the workflow execution.
type SnapshotResult = {
	token: string
	price: string
	priceScaled: string
	decimals: number
	feed: string
	aggregator: string
	roundId: string
	blockNumber: string
	timestamp: string
	txHash: string
}

// ---------------------------------------------------------------------------
// ABIs / constants
// ---------------------------------------------------------------------------

// Minimal Chainlink AggregatorV2V3 proxy ABI (only what we read).
const aggregatorAbi = [
	{ type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
	{ type: 'function', name: 'description', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
	{ type: 'function', name: 'aggregator', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
	{
		type: 'function',
		name: 'latestRoundData',
		stateMutability: 'view',
		inputs: [],
		outputs: [
			{ name: 'roundId', type: 'uint80' },
			{ name: 'answer', type: 'int256' },
			{ name: 'startedAt', type: 'uint256' },
			{ name: 'updatedAt', type: 'uint256' },
			{ name: 'answeredInRound', type: 'uint80' },
		],
	},
] as const

// Solidity layout of ISnapshot.Record, encoded as the report payload.
const recordAbiParams = [
	{
		type: 'tuple',
		name: 'record',
		components: [
			{ name: 'token', type: 'string' },
			{ name: 'price', type: 'uint256' },
			{ name: 'blockNumber', type: 'uint256' },
			{ name: 'timestamp', type: 'uint256' },
		],
	},
] as const

// keccak256("AnswerUpdated(int256,uint256,uint256)") — emitted by the underlying aggregator
// at the block where a new answer takes effect.
const ANSWER_UPDATED_SIG = keccak256(toBytes('AnswerUpdated(int256,uint256,uint256)'))

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

type EvmClient = InstanceType<typeof cre.capabilities.EVMClient>

// Low-level `eth_call` at the last finalized block. Returns the raw ABI-encoded result.
function ethCall(runtime: Runtime<Config>, evmClient: EvmClient, to: Address, data: `0x${string}`): `0x${string}` {
	const reply = evmClient
		.callContract(runtime, {
			call: encodeCallMsg({ from: zeroAddress, to, data }),
			blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
		})
		.result()
	return bytesToHex(reply.data)
}

/**
 * Locates the block number at which the Data Feed answer was last updated.
 *
 * Chainlink aggregators do not expose the update block directly via a getter — `latestRoundData`
 * only returns the `updatedAt` timestamp. The block is exposed through the `AnswerUpdated` event,
 * which the underlying aggregator emits whenever a new answer takes effect. We therefore read the
 * proxy's current `aggregator()` implementation, scan recent `AnswerUpdated` logs, and take the
 * most recent one (highest block) as the last-update block.
 */
function findLastUpdateBlock(
	runtime: Runtime<Config>,
	evmClient: EvmClient,
	aggregator: Address,
	expectedAnswer: bigint,
	lookbackBlocks: number,
): bigint {
	const head = evmClient.headerByNumber(runtime, { blockNumber: LAST_FINALIZED_BLOCK_NUMBER }).result()
	if (!head.header?.blockNumber) {
		throw new Error('Could not read finalized block header')
	}
	const finalizedBlock = protoBigIntToBigint(head.header.blockNumber)
	const lookback = BigInt(lookbackBlocks)
	const fromBlock = finalizedBlock > lookback ? finalizedBlock - lookback : 0n

	const reply = evmClient
		.filterLogs(runtime, {
			filterQuery: {
				addresses: [hexToBase64(aggregator)],
				topics: [{ topic: [hexToBase64(ANSWER_UPDATED_SIG)] }],
				fromBlock: bigintToProtoBigInt(fromBlock),
				toBlock: bigintToProtoBigInt(finalizedBlock),
			},
		})
		.result()

	if (!reply.logs || reply.logs.length === 0) {
		throw new Error(
			`No AnswerUpdated events for aggregator ${aggregator} in blocks ${fromBlock}-${finalizedBlock}. ` +
				'Increase "answerUpdatedLookbackBlocks" in config.',
		)
	}

	let latest = reply.logs[0]
	for (const log of reply.logs) {
		if (log.blockNumber && latest.blockNumber && protoBigIntToBigint(log.blockNumber) > protoBigIntToBigint(latest.blockNumber)) {
			latest = log
		}
	}
	const updateBlock = protoBigIntToBigint(latest.blockNumber!)

	// Sanity check: the indexed `current` answer (topics[1]) should match latestRoundData.
	if (latest.topics.length > 1) {
		const loggedAnswer = bytesToBigint(latest.topics[1])
		if (loggedAnswer !== expectedAnswer) {
			runtime.log(
				`Note: most recent AnswerUpdated answer (${loggedAnswer}) differs from latestRoundData answer (${expectedAnswer}); a new round may be mid-finalization.`,
			)
		}
	}

	runtime.log(`Data feed answer last updated at block ${updateBlock} (scanned ${fromBlock}-${finalizedBlock}).`)
	return updateBlock
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

function writeSnapshot(
	runtime: Runtime<Config>,
	evmClient: EvmClient,
	config: Config,
	record: { token: string; price: bigint; blockNumber: bigint; timestamp: bigint },
): string {
	// ABI-encode the Record exactly as Snapshot.onReport expects: abi.decode(report, (Record)).
	const reportData = encodeAbiParameters(recordAbiParams, [record])

	// Generate a DON-signed report (consensus + signatures).
	const reportResponse = runtime
		.report({
			encodedPayload: hexToBase64(reportData),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	// Submit it. The Forwarder verifies the report and calls onReport on the Snapshot contract.
	const writeResult = evmClient
		.writeReport(runtime, {
			receiver: config.snapshotAddress,
			report: reportResponse,
			gasConfig: { gasLimit: config.gasLimit },
		})
		.result()

	if (writeResult.txStatus !== TxStatus.SUCCESS) {
		throw new Error(`writeReport failed: ${writeResult.errorMessage ?? `status ${writeResult.txStatus}`}`)
	}

	const txHash = bytesToHex(writeResult.txHash ?? new Uint8Array(32))
	runtime.log(`Snapshot written onchain. tx=${txHash}`)
	runtime.log(`View: https://sepolia.etherscan.io/tx/${txHash}`)
	return txHash
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): SnapshotResult => {
	const config = runtime.config

	// 1. Parse the HTTP body: { "token": "ETH" }.
	const body = requestSchema.parse(JSON.parse(new TextDecoder().decode(payload.input)))
	const token = body.token.toUpperCase()
	runtime.log(`HTTP trigger received: token=${token}`)

	// 2. Resolve the configured Data Feed for that token.
	const feedAddress = config.feeds[token]
	if (!feedAddress) {
		throw new Error(`No Data Feed configured for "${token}". Available: ${Object.keys(config.feeds).join(', ')}`)
	}

	// 3. Build the EVM client for the target chain.
	const network = getNetwork({ chainFamily: 'evm', chainSelectorName: config.chainName, isTestnet: true })
	if (!network) {
		throw new Error(`Unknown chain name: ${config.chainName}`)
	}
	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
	const feed = feedAddress as Address

	// 4. Read the price from the Chainlink Data Feed via EVM Read.
	const decimals = decodeFunctionResult({
		abi: aggregatorAbi,
		functionName: 'decimals',
		data: ethCall(runtime, evmClient, feed, encodeFunctionData({ abi: aggregatorAbi, functionName: 'decimals' })),
	})
	const [roundId, answer, , updatedAt] = decodeFunctionResult({
		abi: aggregatorAbi,
		functionName: 'latestRoundData',
		data: ethCall(
			runtime,
			evmClient,
			feed,
			encodeFunctionData({ abi: aggregatorAbi, functionName: 'latestRoundData' }),
		),
	})
	if (answer <= 0n) {
		throw new Error(`Data Feed returned a non-positive price (${answer}) for ${token}`)
	}
	const priceScaled = formatUnits(answer, decimals)
	runtime.log(`Read ${token}/USD: ${priceScaled} (raw=${answer}, decimals=${decimals}, roundId=${roundId})`)

	// 5. The price (proxy) and the AnswerUpdated event (implementation) live in different contracts.
	const aggregator = decodeFunctionResult({
		abi: aggregatorAbi,
		functionName: 'aggregator',
		data: ethCall(runtime, evmClient, feed, encodeFunctionData({ abi: aggregatorAbi, functionName: 'aggregator' })),
	})
	const blockNumber = findLastUpdateBlock(runtime, evmClient, aggregator, answer, config.answerUpdatedLookbackBlocks)

	// 6. Assemble the Record and write it onchain via EVM Write.
	const record = { token, price: answer, blockNumber, timestamp: updatedAt }
	const txHash = writeSnapshot(runtime, evmClient, config, record)

	return {
		token,
		price: answer.toString(),
		priceScaled,
		decimals,
		feed: feedAddress,
		aggregator,
		roundId: roundId.toString(),
		blockNumber: blockNumber.toString(),
		timestamp: updatedAt.toString(),
		txHash,
	}
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function initWorkflow(_config: Config) {
	const http = new cre.capabilities.HTTPCapability()
	return [cre.handler(http.trigger({ authorizedKeys: [] }), onHttpTrigger)]
}
