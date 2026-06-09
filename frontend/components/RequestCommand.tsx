'use client'

import { Check, Copy, Terminal } from 'lucide-react'
import { useState } from 'react'

const QUICK = ['ETH', 'BTC', 'LINK']

export function RequestCommand() {
  const [token, setToken] = useState('ETH')
  const [copied, setCopied] = useState(false)

  const symbol = token.trim().toUpperCase() || 'ETH'
  const command = `cre workflow simulate my-workflow --broadcast --non-interactive --trigger-index 0 --http-payload '{"token":"${symbol}"}'`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <section className="mt-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Terminal className="size-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">Update a price</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        The workflow runs from the CLI (CRE writes are signed by the workflow, not the browser). Pick a token and run
        this to fetch its price and write a fresh snapshot on-chain:
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="token-input" className="sr-only">
          Token symbol
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick token picker">
          {QUICK.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={symbol === t}
              onClick={() => setToken(t)}
              className={`h-8 rounded-md border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                symbol === t
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-surface-2 text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          id="token-input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          aria-label="Token symbol"
          className="h-8 w-28 rounded-md border border-border bg-surface-2 px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          placeholder="ETH"
        />
      </div>

      <div className="mt-3 flex items-stretch gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-border bg-surface-2 px-3 py-2.5 font-mono text-xs text-foreground whitespace-pre">
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy command to clipboard"
          className="inline-flex h-auto shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-positive" aria-hidden />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden />
              Copy
            </>
          )}
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Then hit <span className="text-foreground">Refresh</span> above — the new snapshot appears once the
        transaction is mined.
      </p>
    </section>
  )
}
