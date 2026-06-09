import { formatUnits } from 'viem'

/** Format a raw feed answer (string bigint) as a USD price. */
export function formatUsd(rawPrice: string, decimals: number): string {
  const value = Number(formatUnits(BigInt(rawPrice), decimals))
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value)
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/** Human relative time from a unix-seconds timestamp string, e.g. "3 min ago". */
export function relativeTime(unixSeconds: string): string {
  const then = Number(unixSeconds) * 1000
  const diffSec = Math.round((Date.now() - then) / 1000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ]
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs || unit === 'second') {
      return rtf.format(-Math.round(diffSec / secs), unit)
    }
  }
  return 'just now'
}

/** Absolute UTC timestamp, e.g. "2026-06-09 21:13:54 UTC". */
export function absoluteUtc(unixSeconds: string): string {
  return `${new Date(Number(unixSeconds) * 1000).toISOString().slice(0, 19).replace('T', ' ')} UTC`
}

export function formatInt(value: string): string {
  return new Intl.NumberFormat('en-US').format(BigInt(value))
}
