# Snapshot Dashboard (bonus frontend)

A small, read-only Next.js dashboard that displays the token price snapshots written on-chain by the
[CRE workflow](../README.md). It reads `latestSnapshot()`, `snapshotOf(token)`, and `tokens()` from
the deployed `Snapshot` contract on Sepolia via viem — it does **not** trigger the workflow or sign
anything (that's the backend's job).

This is an optional extra; the assignment deliverable is the workflow + contract in the parent repo.

![Snapshot dashboard](../docs/dashboard.png)

## Run locally

```bash
cd frontend
bun install          # or: npm install
bun run dev          # or: npm run dev
# open http://localhost:3000
```

Defaults point at the live deployment, so it works with zero config. To use your own contract/RPC,
copy `.env.example` to `.env.local` and edit the values.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- viem (server-side contract reads via `/api/snapshot`)

## Deploy (optional)

Deploys cleanly to Vercel as a normal Next.js app. Set `NEXT_PUBLIC_SNAPSHOT_ADDRESS` and
`SEPOLIA_RPC_URL` as environment variables if you don't want the defaults.
