# Brand — Token Price Snapshot dashboard

_Status: active (lightweight, scoped to the `frontend/` dashboard)_

A dark, data-dense developer dashboard styled to sit naturally alongside Chainlink tooling.

## Palette (dark-first)

| Token            | Hex       | Use                                    |
| ---------------- | --------- | -------------------------------------- |
| background       | `#0B0E14` | page background (near-black navy)      |
| surface / card   | `#131722` | cards, panels                          |
| border           | `#232A3B` | hairlines, dividers                    |
| foreground       | `#E6E9F0` | primary text                           |
| muted-foreground | `#8B93A7` | secondary text, labels                 |
| primary          | `#4C82FB` | Chainlink-blue accent, links, focus    |
| primary-strong   | `#375BD2` | Chainlink brand blue (hover/active)    |
| positive         | `#2EBD85` | success / live values                  |
| danger           | `#F6465D` | errors                                 |

Contrast: foreground/background ≈ 14:1, muted/background ≈ 5.6:1 — both pass WCAG AA.

## Typography

- UI: **Geist** (via `next/font`).
- Numbers, addresses, hashes: **Geist Mono** — tabular, so prices/blocks align.

## Voice

Precise and technical, no marketing fluff. Label things plainly ("Last updated block",
"Feed answer"). Numbers are the hero.
