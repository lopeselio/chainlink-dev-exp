import { createPublicClient, http, type Address } from 'viem'
import { sepolia } from 'viem/chains'

// Deployed Snapshot consumer (overridable via env). See repo README "Live deployment".
export const SNAPSHOT_ADDRESS = (process.env.NEXT_PUBLIC_SNAPSHOT_ADDRESS ??
  '0x8ab8054b8b94A8a42719A1D62e08107115660B6A') as Address

// USD Chainlink Data Feeds report 8 decimals; the contract stores the raw answer.
export const PRICE_DECIMALS = 8

export const snapshotAbi = [
  {
    type: 'function',
    name: 'latestSnapshot',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'token', type: 'string' },
          { name: 'price', type: 'uint256' },
          { name: 'blockNumber', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'snapshotOf',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'string' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'token', type: 'string' },
          { name: 'price', type: 'uint256' },
          { name: 'blockNumber', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
  },
  { type: 'function', name: 'tokens', stateMutability: 'view', inputs: [], outputs: [{ type: 'string[]' }] },
  { type: 'function', name: 'i_forwarder', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com'),
})

export type SnapshotRecord = {
  token: string
  price: string // raw bigint as string
  blockNumber: string
  timestamp: string
}

export const explorer = {
  address: (a: string) => `https://sepolia.etherscan.io/address/${a}`,
  block: (b: string | number) => `https://sepolia.etherscan.io/block/${b}`,
}
