'use client'

import { AlertCircle, Github, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { explorer, PRICE_DECIMALS, type SnapshotRecord } from '@/lib/contract'
import { formatUsd, relativeTime, shortenAddress } from '@/lib/format'
import { PriceCard } from './PriceCard'
import { RequestCommand } from './RequestCommand'
import { Pill, Skeleton } from './ui'

type ApiData = {
  contract: string
  forwarder: string
  network: string
  records: SnapshotRecord[]
  latest: SnapshotRecord | null
  fetchedAt: number
}

const REPO_URL = 'https://github.com/lopeselio/chainlink-dev-exp'
const REFRESH_MS = 30_000

export function Dashboard() {
  const [data, setData] = useState<ApiData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/snapshot', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshots')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const records = data?.records ?? []
  const active: SnapshotRecord | undefined =
    records.find((r) => r.token === selected) ?? data?.latest ?? records[0]

  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-5 pb-16">
      {/* Header */}
      <header className="bg-grid-glow -mx-5 px-5 pt-12 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Token Price Snapshot
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              USD prices written on-chain by a Chainlink CRE workflow · Sepolia
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
        {data && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Pill href={explorer.address(data.contract)}>Contract {shortenAddress(data.contract)}</Pill>
            <Pill href={explorer.address(data.forwarder)}>Forwarder {shortenAddress(data.forwarder)}</Pill>
            <Pill>{data.network}</Pill>
          </div>
        )}
      </header>

      {/* Body */}
      {loading ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={load} />
      ) : records.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {records.length > 1 && (
            <div role="tablist" aria-label="Tokens" className="mb-5 flex flex-wrap gap-2">
              {records.map((r) => {
                const isActive = r.token === active?.token
                return (
                  <button
                    key={r.token}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelected(r.token)}
                    className={`h-9 rounded-lg border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      isActive
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-surface text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r.token}
                  </button>
                )
              })}
            </div>
          )}

          {active && <PriceCard record={active} contract={data!.contract} />}

          {records.length > 1 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {records.map((r) => (
                <button
                  key={r.token}
                  type="button"
                  onClick={() => setSelected(r.token)}
                  className={`flex flex-col items-start gap-1 rounded-xl border bg-surface p-4 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    r.token === active?.token ? 'border-primary/60' : 'border-border'
                  }`}
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {r.token}/USD
                  </span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                    {formatUsd(r.price, PRICE_DECIMALS)}
                  </span>
                  <span className="text-xs text-muted-foreground">updated {relativeTime(r.timestamp)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Update-a-price command */}
      {!loading && <RequestCommand />}

      {/* Footer */}
      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        <p>
          Each price is read from a Chainlink Data Feed via the CRE <span className="text-foreground">EVM Read</span>{' '}
          capability and written back through the Forwarder via <span className="text-foreground">EVM Write</span>.
          This page only reads the resulting on-chain state.
        </p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Github className="size-4" aria-hidden />
          lopeselio/chainlink-dev-exp
        </a>
      </footer>
    </main>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-10 text-center">
      <AlertCircle className="size-8 text-danger" aria-hidden />
      <div>
        <p className="font-medium text-foreground">Couldn&apos;t read the contract</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        Try again
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-10 text-center">
      <p className="font-medium text-foreground">No snapshots yet</p>
      <p className="max-w-md text-sm text-muted-foreground">
        The contract has no records. Run the workflow to write the first price:
      </p>
      <code className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-foreground">
        cre workflow simulate my-workflow --broadcast
      </code>
    </div>
  )
}
