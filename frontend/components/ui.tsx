import { ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'

export function Pill({ href, children }: { href?: string; children: ReactNode }) {
  const className =
    'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        <ExternalLink className="size-3" aria-hidden />
      </a>
    )
  }
  return <span className={className}>{children}</span>
}

export function Stat({ label, children, mono = true }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`text-foreground ${mono ? 'font-mono' : ''} text-sm`}>{children}</dd>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse-soft rounded-md bg-surface-2 ${className}`} />
}
