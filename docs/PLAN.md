# 26/27 Season Plan

Working plan for the Qitawrari League FPL companion, agreed 2 September 2026. GW2 is complete, GW3 deadline is Friday 4 September 17:30 UTC. The league has 14 managers and a paired H2H league.

Runs on Vercel Hobby, GitHub Actions on the public repo, the Upstash Redis free tier, and Telegram. Nothing is paid for.

## Decisions taken up front

| Area | Decision | Why |
|---|---|---|
| Data source | One typed FPL client in `lib/fpl/client.ts`. Pages never call `fetch` directly. | Five code paths fetch bootstrap today, some raw, some cached forever. |
| Shared cache | Upstash Redis free tier via the Vercel Marketplace, wrapped by `lib/fpl/cache.ts`. TTLs vary with live state read from `event-status`. | Next's data cache caps entries at 2MB and cannot vary TTL by match state. Redis also holds the bot's sent-message state. Free tier is 500K commands a month. |
| Clubs and kits | Derived from bootstrap `teams` at runtime, keyed by `short_name` and `code`. No hardcoded ID tables. | 26/27 shifted every club ID from 6 upward and added Coventry, Hull, Ipswich. |
| Chips | Modelled from bootstrap `chips` windows, not a fixed list of four. | Every chip now exists twice, GW1 to 19 and GW20 to 38. Wildcard opens at GW2. |
| Scheduling | A GitHub Actions workflow on a 5 minute cron calls `/api/cron/tick` with `CRON_SECRET`. No Vercel crons. | Vercel Hobby crons run once a day. The repo is public, so Actions minutes are free. |
| Telegram | Raw Bot API over `fetch`, webhook route on the site, one group chat. Times shown in EAT with a 12-hour clock, for example Fri 8:30 PM. | No extra dependency, one deploy target. |
| Tests | Vitest with real GW2 payloads as fixtures. | Scoring logic is pure and was only ever verified by hand. |
| Gameweek param | `gw` everywhere, read from `searchParams`. The `x-url` middleware header goes. | Two names for one thing today, and one of them needs a middleware hack. |

## Status

Phases 0 to 3 were implemented and reviewed on 2 September 2026 (commits 95bab33 through 83611a5 on main). Phases 4 and 5 were implemented on 3 September 2026. Phase 5 needs the one-time setup in `docs/BOT.md` (BotFather, env vars, `setWebhook`, the GitHub secret and variable) before the bot goes live. Phase 6 is the ongoing live checks, starting with GW3 on Friday 4 September.

## Phase summary

| Phase | Scope | Effort | Target |
|---|---|---|---|
| 0 | Housekeeping and dead code | half a day | before GW3 deadline |
| 1 | Season-breaking accuracy fixes | 1 day | before GW3 deadline |
| 2 | Data layer and caching | 2 days | during GW3 and GW4 |
| 3 | Mobile pass | 1.5 days | by GW5 |
| 4 | League features | 3 days | by GW6 |
| 5 | Telegram bot and recap | 2 days | by GW7 |
| 6 | Live verification | ongoing | every gameweek |

## Phase 0. Housekeeping

Remove what nothing uses, so every later diff is smaller.

Delete:

- `components/league-table/league-table-old.tsx`, `components/ui/canvas.tsx`, `components/navigation-tabs.tsx`, `components/layout/user-nav.tsx`, `components/layout/auto-hide-bottom-nav.tsx`
- `tailwind.config.ts` (the `.js` file is the one Tailwind loads)
- `app/league/loading.tsx` (no `/league` route exists)
- `app/api/debug/*` (publicly reachable, one runs sequential history fetches)
- The legacy path in `services/league-service.ts`, `services/net-gameweek-points.ts`, `services/get-player-name.ts`, `services/get-player-ownership.ts` once Phase 2 replaces them
- `fpl-flow-visual.html`, `fpl-gameweek-points-flow.md` move into `docs/`; `public/Jokes.txt` goes

Dependencies: drop `recharts`, `@types/recharts`, `framer-motion`, `@radix-ui/react-tabs`, `@radix-ui/react-avatar`. Replace the two hero orbs with a CSS keyframe.

Quick fixes in the same pass:

- Favicon path `/images/fav.png` to `/Images/fav.png`
- `export const viewport` in `app/layout.tsx` with `themeColor` and `viewportFit: "cover"`
- Container padding `{ DEFAULT: "0.75rem", md: "2rem" }` in `tailwind.config.js`
- Remove the duplicated `@layer base` block in `app/globals.css`
- Add Vitest, save the GW2 payloads captured on 2 September under `test/fixtures/` (bootstrap slim, live, fixtures, picks, history, standings, h2h)

Done when `npm run build`, `npm run lint` and `npm test` all pass and the root loading skeleton matches the league page.

## Phase 1. Season-breaking accuracy fixes

### 1.1 Clubs and kits from bootstrap

- New `lib/clubs.ts` exposing `getClubs()` from the slim bootstrap: `id`, `name`, `short_name`, `code`.
- Rename kit files to short codes: `ARS-home.png`, `ARS-gk.png`, and so on. Add Coventry, Hull, Ipswich or fall back to the official shirt image at `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_{code}-66.png` (goalkeeper variant `shirt_{code}_1-66.png`). Add the host to `images.remotePatterns`.
- `KitImage` takes a club, not a numeric ID. Delete `lib/team-ids.ts` and the ID table in `lib/kits-map.ts`.

### 1.2 Delete the Manager chip scan

Remove `app/stats/getStatData.ts:598-699` and the `assistantManagerStats` type and any UI that reads it. This alone removes up to 16 picks calls per manager per stats page load.

### 1.3 Chip model with two halves

- New `lib/chips.ts`: `getChipWindows()` from bootstrap `chips` (`name`, `start_event`, `stop_event`), and `chipStatus(history.chips, windows)` returning, per manager, per window: used at GW n, or available, or expired.
- Chips page shows both halves. The gameweek page's per-GW counting stays as is.

### 1.4 Deterministic tie-breaks

Most gameweek wins: tie on wins, then total net points in the won gameweeks, then alphabetical, and label the tile "shared" if still level. Remove `Math.random()` at `getStatData.ts:590`.

### 1.5 Honest error states

- `getLeagueData` throws instead of returning an empty GW1 league. Add `app/error.tsx` with a retry button.
- Validate the requested gameweek only against a successfully fetched current gameweek.
- Stats pages render the error they currently swallow.

### 1.6 Season config in one place

- New `config/league.ts`: season records (champion, Qitawrari per season), app title. Removes the hardcoded names from `app/dashboard/page.tsx` and `app/qitawrari/page.tsx`.
- Cup countdown reads `game_settings.cup_start_event_id` and that event's `deadline_time` from bootstrap. No more counting up from a 2025 date.

### 1.7 Finished means checked

Stats that award anything use `data_checked`, not `finished`, so winners are not declared before bonus is final.

Done when GW3 team pages show correct kits, the stats page loads in under 3 seconds, the chips page shows both halves, and reloading gameweek winners never changes the leader.

## Phase 2. Data layer and caching

### 2.1 One client

`lib/fpl/client.ts`: typed fetchers with the browser User-Agent headers, three retries with backoff, no retry on 404, 10 second timeout, concurrency capped at 8 with a small semaphore. Endpoints: bootstrap (slimmed), fixtures, live, picks, history, transfers, entry, classic standings, H2H standings, H2H matches, event-status.

Slim bootstrap keeps only: `events` (id, name, deadline_time, is_current, is_next, finished, data_checked, average_entry_score, highest_score), `teams`, `chips`, `game_settings.cup_start_event_id`, and per element `id`, `web_name`, `first_name`, `second_name`, `team`, `element_type`, `code`, `now_cost`, `selected_by_percent`, `status`, `news`. Roughly 150KB instead of 1.6MB.

### 2.2 Cache policy

`lib/fpl/cache.ts`: `cached(key, ttlSeconds, fn)` over Redis, plus React `cache()` for in-request memoisation. Live state comes from `event-status` (60s TTL): live means a fixture in the current gameweek has started and not finished, or today's row has `bonus_added: false`.

| Data | Live | Quiet | After `data_checked` |
|---|---|---|---|
| event-status | 60s | 60s | 60s |
| bootstrap slim | 60s | 5 min | 5 min |
| live points | 30s | 10 min | 24h |
| fixtures | 60s | 10 min | 24h |
| picks | 60s | 10 min | 24h |
| history | 5 min | 5 min | 5 min |
| transfers | until next deadline | until next deadline | until next deadline |
| standings, H2H | 5 min | 5 min | 5 min |

### 2.3 One snapshot for every page

`services/league.ts` exposes `getLeagueSnapshot(gw)`: standings, per-manager live totals, captains, chips, players to start, H2H ranks, transfer costs. The league table, gameweek page, dashboard and stats hub all consume it. `services/stats.ts` builds on the snapshot plus N history calls and never fans out twice.

Wire `app/team/[id]/page.tsx` to the existing `services/team-page-service.ts`, then delete the raw fetches in that page and in `app/gameweek/page.tsx`.

### 2.4 Bounded API routes

Routes become `/api/league/[gw]`, `/api/team/[id]/[gw]`, `/api/ownership/[gw]`, `/api/transfers/[gw]`, `/api/h2h/[gw]`. Every route validates `gw` between 1 and the current gameweek and `id` against league membership, sets `Cache-Control: s-maxage` to match the Redis TTL, and returns a plain error message rather than the upstream one.

Done when a cold league page makes about 33 upstream calls and a warm one makes none, the stats page makes about 17, `npm test` covers `sumPicks`, `countPlayersToStart`, the tie-break and the chip model against fixtures.

## Phase 3. Mobile pass

- Type scale 12, 13, 15, 18, 24 px. Nothing under 12px. Uppercase labels get letter-spacing instead of shrinking.
- League table on phones: rank, team line, GW, total. The team line carries manager, captain and a chip badge. H2H rank and players to start move into a tap-to-open row detail. Sticky header. Full view stays for tablets and up.
- Chip badges open a tap popover (Radix Popover is already installed). Bench rows are always tappable.
- Comparison stacks on phones with a sticky team switcher.
- Remove the empty 56px header on mobile. Bottom nav gets `padding-bottom: env(safe-area-inset-bottom)` and highlights by path prefix.
- Back button uses history when there is any, home otherwise.
- Gameweek switching becomes client-side: the page server-renders the current gameweek, then a small `useLeague(gw)` hook reads `/api/league/[gw]` with in-memory caching so revisiting a gameweek is instant.
- PWA: `app/manifest.ts`, 192 and 512 icons, standalone display, theme colour.

Done when Lighthouse mobile scores at least 90 on performance and accessibility, no text is under 12px, and the nav clears the iPhone home indicator.

## Phase 4. League features

### 4.1 H2H matchups (`/h2h`)

Fixtures from `leagues-h2h-matches/league/{id}/?event={gw}`. Each card shows both managers, live net points from the snapshot, and a leading, level or trailing state. Below it the H2H table. Gets a bottom nav slot.

### 4.2 Effective ownership (`/stats/ownership`)

Per player for the selected gameweek: owners, captains, effective ownership percentage, points this gameweek, and league swing (points multiplied by owners plus captains, divided by 14). Two views: highest ownership, and differentials owned by one manager. Reuses the ownership route once it is bounded.

### 4.3 Chips remaining

Grid of manager by chip by half on the chips page, from the Phase 1 model. Used cells show the gameweek.

### 4.4 Transfer feed (`/transfers`)

All managers' transfers for the gameweek from `entry/{id}/transfers/`, joined to names, prices, and raw gameweek points for the player in and out, plus the hit cost from picks. Tiles at the top for best and worst transfer of the week.

Done when each page renders from cached data in under a second on a phone and the H2H scores match the official app during GW6.

## Phase 5. Telegram bot and recap

### 5.1 Setup

- Create the bot with BotFather, add it to the league group, disable privacy mode so it sees commands.
- Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET`, `APP_URL`.
- Register the webhook with `setWebhook`, passing `secret_token`, pointing at `/api/telegram/webhook`.

### 5.2 Client

`lib/telegram.ts`: `sendMessage(text)` in HTML parse mode, splitting at 4096 characters, with a retry on 429 honouring `retry_after`.

### 5.3 Webhook commands

`app/api/telegram/webhook/route.ts` checks the secret header, ignores chats other than the league group, and answers:

| Command | Reply |
|---|---|
| `/table` | Top of the table with GW and total points, movement arrows |
| `/gw` | Current gameweek leader, struggler, most captained, chips played |
| `/h2h` | This week's matchups with live scores |
| `/chips` | Chips remaining per manager for the current half |
| `/transfers` | This week's transfer feed |
| `/recap [gw]` | The recap text for a gameweek, default the last checked one |
| `/prizes` | Managers of the month for finished months, and the chip master leaderboard |
| `/deadline` | Next deadline in EAT, 12-hour clock, with time remaining |

All replies come from the Redis-backed snapshot so they return well inside Telegram's timeout.

### 5.4 Recap generator

`services/recap.ts` is a pure function from a snapshot to text, used by the bot and by a recap card on the gameweek page. Contents, in order:

1. Gameweek winner and struggler with net points
2. Table movement: biggest riser and faller, new leader if changed
3. Captaincy: most captained, best and worst captain choice
4. Bench points wasted, top three
5. Hits taken and whether they paid off
6. Chips played
7. H2H results
8. Table top three and bottom one

Deterministic and testable against fixtures. A generated one-line roast can be layered on later without changing the interface.

### 5.5 Scheduler

The bot sends exactly two kinds of message on its own. Everything else is on command.

`.github/workflows/tick.yml` runs on a `*/5 * * * *` schedule and calls `${APP_URL}/api/cron/tick` with `CRON_SECRET` in a header. The route does two idempotent checks against Redis keys and returns within a few seconds:

- **Deadline reminder**, once, when the next `deadline_time` is 30 minutes or less away and `reminder:{gw}` is unset. The message gives the deadline in EAT, 12-hour clock, and the minutes remaining.
- **Recap**, once, when every fixture in the current event has `finished_provisional: true` and `recap:{gw}` is unset. This fires at the final whistle of the last match, so it uses provisional bonus. Fixtures that FPL moves out of the event are no longer in that list, so a postponed match does not hold the recap back.

GitHub schedules can slip by several minutes at busy times. The reminder condition is "30 minutes or less", so a slipped run still sends it, just closer to the deadline. If a slip ever crosses the deadline the reminder is skipped rather than sent late.

Done when the bot answers `/table` in the group, GW7's recap posts itself at the final whistle of the last fixture, and the GW8 reminder arrives inside the last half hour.

## Phase 6. Live verification

- Friday 4 September, GW3: watch the league table against the official app during the evening fixture. Keep the point-comparison logic from the old debug route as a test helper, not a route.
- Each gameweek until Phase 5 ships: spot check one manager with an auto-sub and one with a chip.
- Log upstream call counts per route for a week after Phase 2 and confirm the targets.

## Infrastructure and secrets

| Name | Used by |
|---|---|
| `FPL_LEAGUE_ID`, `FPL_H2H_LEAGUE_ID` | existing |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Redis cache and bot state (names as provisioned by the Marketplace) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` | bot |
| `CRON_SECRET` | tick route, and a GitHub Actions secret |
| `APP_URL` | GitHub Actions variable pointing at the production deployment |

Hobby functions time out at 10 seconds by default. Heavy routes set `export const maxDuration = 60`, and the cache keeps the common path far under that.

## Risks

- FPL changes payloads in the summer and occasionally mid-season. The fixture tests and the single client keep the blast radius to one file.
- FPL rate limits bursts. The concurrency cap and the shared cache keep a 14-person league far below it.
- GitHub scheduled workflows can slip by several minutes under load. The reminder window tolerates it; the recap is not time-sensitive.
- The Upstash free tier allows 500K commands a month. A 5 minute tick is about 9K a month, and page loads batch reads with `MGET`, so a 14-person league stays well inside it.
- Hobby functions time out at 10 seconds unless `maxDuration` is raised, and the cap is 60. Cold stats pages must stay under that even with the cache empty.
- A recap at the final whistle uses provisional bonus. Bonus can change once FPL confirms it, so a captain or winner line can occasionally differ from the final table.
- A Telegram webhook needs the production URL. Preview deployments must not register webhooks.

## Settled

- Kits: local files renamed to short codes, with the official shirt image as fallback.
- Bot sends only the 30 minute deadline reminder and the final-whistle recap on its own. Everything else is on command.
- Redis over the Next data cache for all shared FPL data.
- Vercel Hobby, GitHub Actions on the public repo, Upstash free tier. No paid services, no n8n.
