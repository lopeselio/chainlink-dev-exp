import { NextResponse } from 'next/server'
import { SNAPSHOT_ADDRESS, publicClient, snapshotAbi, type SnapshotRecord } from '@/lib/contract'

export const dynamic = 'force-dynamic'

type RecordTuple = { token: string; price: bigint; blockNumber: bigint; timestamp: bigint }

const serialize = (r: RecordTuple): SnapshotRecord => ({
  token: r.token,
  price: r.price.toString(),
  blockNumber: r.blockNumber.toString(),
  timestamp: r.timestamp.toString(),
})

export async function GET() {
  try {
    const [tokens, latest, forwarder] = await Promise.all([
      publicClient.readContract({ address: SNAPSHOT_ADDRESS, abi: snapshotAbi, functionName: 'tokens' }),
      publicClient.readContract({ address: SNAPSHOT_ADDRESS, abi: snapshotAbi, functionName: 'latestSnapshot' }),
      publicClient.readContract({ address: SNAPSHOT_ADDRESS, abi: snapshotAbi, functionName: 'i_forwarder' }),
    ])

    const records = await Promise.all(
      (tokens as readonly string[]).map((t) =>
        publicClient.readContract({
          address: SNAPSHOT_ADDRESS,
          abi: snapshotAbi,
          functionName: 'snapshotOf',
          args: [t],
        }),
      ),
    )

    const latestRecord = latest as RecordTuple
    return NextResponse.json({
      contract: SNAPSHOT_ADDRESS,
      forwarder: forwarder as string,
      network: 'Sepolia',
      records: (records as RecordTuple[]).map(serialize),
      latest: latestRecord.timestamp > 0n ? serialize(latestRecord) : null,
      fetchedAt: Date.now(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read contract'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
