# Pending work

What is still open for phases 0 to 5 as of 3 September 2026, after commit 9b7391a on main. Code for all six phases is written, tested and pushed; what remains is one-time setup, live verification that can only happen during a gameweek, and a few "done when" criteria from `PLAN.md` that have not been measured yet.

## Blocking the bot going live (Phase 5 setup)

None of this is code. Follow `docs/BOT.md` in order.

- [ ] Create the bot with BotFather, disable privacy mode, add it to the league group, and read the group chat id from `getUpdates`.
- [ ] Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` and `CRON_SECRET` on the Vercel **production** environment only. Preview deployments must never register a webhook.
- [ ] Call `setWebhook` with the production URL and the secret token, then confirm with `getWebhookInfo`.
- [ ] Add the GitHub repository secret `CRON_SECRET` and the repository variable `APP_URL`. Until both exist, `.github/workflows/tick.yml` runs every five minutes and fails fast with a "must be set" message. Nothing is sent, but the Actions tab fills with red runs.
- [ ] Send `/table` in the group and confirm the reply arrives within a few seconds. Then try `/gw`, `/h2h`, `/chips`, `/transfers`, `/recap 2` and `/deadline` once each.
- [ ] Trigger the workflow by hand from the Actions tab and confirm the response body reads `"reminder":"not-due","recap":"not-due"` on a quiet day.

## Live verification that needs a real gameweek (Phase 6, and the "done when" lines of Phases 1, 4 and 5)

| When | Check | From |
|---|---|---|
| Fri 4 Sep, GW3 evening fixture | League table matches the official app while a match is live. `test/helpers/compare-points.ts` is the point-comparison helper. | Phase 6 |
| GW3 | Team pages show correct kits, including a Coventry, Hull or Ipswich player falling back to the official shirt image. | Phase 1 |
| GW3 | Reloading gameweek winners never changes the leader. | Phase 1 |
| GW3 | Stats page loads in under 3 seconds cold. | Phase 1 |
| Each gameweek until the bot is live | Spot-check one manager with an auto-sub and one with a chip against the official app. | Phase 6 |
| One week after deploy | Read the `[fpl] <path> upstream=N cache=hits/misses` lines in Vercel logs and confirm a cold league page makes about 33 upstream calls, a warm one none, and the stats page about 17. | Phase 2 |
| GW6 | H2H scores on `/h2h` match the official app during play. | Phase 4 |
| GW6 | Each Phase 4 page renders from cached data in under a second on a phone. | Phase 4 |
| GW7 last fixture | The recap posts itself at the final whistle, with provisional bonus. | Phase 5 |
| GW8 deadline | The reminder arrives inside the last half hour. | Phase 5 |

## Not yet measured

- [ ] Lighthouse mobile scores of at least 90 for performance and accessibility (Phase 3 "done when"). The mobile pass was checked visually at a 390px viewport with puppeteer, but Lighthouse was never run.
- [ ] Upstash command usage after a full gameweek. The estimate in `PLAN.md` is about 9K commands a month from the tick alone; confirm the league stays well inside the 500K free tier once the bot and page loads are counted.

## Known limitations to keep in mind

- **Recap timing.** The tick only posts a recap while the gameweek is not yet `data_checked`. If GitHub's schedule slips for long enough that FPL checks the gameweek first, the recap is skipped rather than posted late. `/recap` in the group still returns it on demand.
- **Provisional bonus.** The automatic recap uses bonus at the final whistle. A captain or winner line can differ from the final table once FPL confirms bonus, and the message says so.
- **Odd-sized H2H league.** FPL pairs one manager per gameweek against an "AVERAGE" side. `/h2h` and the recap show this as a bye; it is correct behaviour, not a bug.
- **Navigation.** H2H has a bottom-nav slot. Transfers and effective ownership are reached from the Stats hub and, on desktop, the top nav. Adding more bottom-nav slots was not in scope.
- **Recap card on a live gameweek.** The card on `/gameweek` fetches the recap for whichever gameweek is selected, including the current one mid-play. The header shows "provisional bonus" in that case; the text is a snapshot of scores so far.

## Not planned

These came up during review and were left out deliberately; listed so they are not rediscovered as gaps.

- A rank race chart (rejected in the initial review).
- A generated one-line roast in the recap. The recap interface is designed so one can be layered on later without changing callers.
- Bot replies to private chats. The webhook drops anything that is not the league group.
