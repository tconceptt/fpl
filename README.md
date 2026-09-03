# Qitawrari League FPL companion

A Next.js app for a 14-manager Fantasy Premier League mini-league: live table, gameweek stats, head-to-head, effective ownership, chips, transfers, and a Telegram bot that answers commands and posts a deadline reminder and a gameweek recap on its own.

Runs on Vercel Hobby, Upstash Redis (free tier) for the shared FPL cache and bot state, and a GitHub Actions cron for the bot's scheduler. See `docs/PLAN.md` for the season plan and `docs/BOT.md` for the bot setup.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # Vitest, fixtures under test/fixtures
npm run lint
npm run build
```

Environment variables (`.env.local` locally, Vercel in production):

| Name | Used by |
|---|---|
| `FPL_LEAGUE_ID`, `FPL_H2H_LEAGUE_ID` | the league and its paired H2H league |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Redis cache and bot state (in-memory fallback when unset) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` | the bot |
| `CRON_SECRET` | `/api/cron/tick`, also a GitHub Actions secret |

## Layout

- `lib/fpl/` the one FPL client, cache policy and TTLs
- `services/` pure league logic: snapshot, H2H, ownership, transfers, recap, bot replies, tick decisions
- `app/` pages and bounded API routes (`/api/league/[gw]`, `/api/h2h/[gw]`, `/api/ownership/[gw]`, `/api/transfers/[gw]`, `/api/recap/[gw]`, `/api/telegram/webhook`, `/api/cron/tick`)
- `test/` Vitest suite against real GW2 payloads
