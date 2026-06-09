import { ExternalLink } from 'lucide-react'
import { explorer, PRICE_DECIMALS, type SnapshotRecord } from '@/lib/contract'
import { absoluteUtc, formatInt, formatUsd, relativeTime } from '@/lib/format'
import { Stat } from './ui'

export function PriceCard({ record, contract }: { record: SnapshotRecord; contract: string }) {
  return (
    <div className="animate-fade-in rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-foreground">{record.token}</span>
          <span className="text-sm text-muted-foreground">/ USD</span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-positive">
          <span className="size-1.5 rounded-full bg-positive" aria-hidden />
          Chainlink Data Feed
        </span>
      </div>

      <p className="mt-3 font-mono text-5xl font-semibold tracking-tight text-foreground tabular-nums sm:text-6xl">
        {formatUsd(record.price, PRICE_DECIMALS)}
      </p>

      <dl className="mt-8 grid grid-cols-1 gap-5 border-t border-border pt-6 sm:grid-cols-3">
        <Stat label="Feed answer (raw)">
          {formatInt(record.price)}
          <span className="text-muted-foreground"> · {PRICE_DECIMALS} dec</span>
        </Stat>
        <Stat label="Last updated block">
          <a
            href={explorer.block(record.blockNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {formatInt(record.blockNumber)}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </Stat>
        <Stat label="Feed updated at">
          <span title={absoluteUtc(record.timestamp)}>{relativeTime(record.timestamp)}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{absoluteUtc(record.timestamp)}</span>
        </Stat>
      </dl>

      <p className="mt-6 text-xs text-muted-foreground">
        Read on-chain from{' '}
        <a
          href={explorer.address(contract)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {contract}
        </a>{' '}
        — written by the CRE workflow via the Forwarder.
      </p>
    </div>
  )
}
