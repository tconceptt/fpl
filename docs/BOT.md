# Telegram bot

The bot answers commands in the league group and sends exactly two messages on its own: a deadline reminder inside the last 30 minutes, and a recap at the final whistle of the last fixture. Everything else is on command. Times are East Africa Time with a 12-hour clock.

## Commands

| Command | Reply |
|---|---|
| `/table` | The table with movement arrows, gameweek net points and totals |
| `/gw` | Leader, struggler, most captained, chips played this gameweek |
| `/h2h` | This week's matchups with live scores, and the top of the H2H table |
| `/chips` | Chips remaining per manager for the current half |
| `/transfers` | This week's transfer feed with points gained and hits |
| `/recap [gw]` | The recap for a gameweek, default the last one FPL has checked |
| `/deadline` | The next deadline in EAT, with time remaining |
| `/help` | This list |

## One-time setup

1. **Create the bot.** Message `@BotFather`, `/newbot`, and keep the token. Then `/setprivacy`, pick the bot, choose **Disable** so it sees commands in the group. Optionally `/setcommands` with the list above so they autocomplete.
2. **Add the bot to the league group.** Get the group's chat id by sending any message in the group and reading `result[].message.chat.id` from:

   ```bash
   curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates" | jq '.result[].message.chat'
   ```

   Group ids are negative, e.g. `-1001234567890`.
3. **Set the Vercel environment variables** on the production environment only. Preview deployments must not have a webhook registered.

   | Name | Value |
   |---|---|
   | `TELEGRAM_BOT_TOKEN` | from BotFather |
   | `TELEGRAM_CHAT_ID` | the group id above |
   | `TELEGRAM_WEBHOOK_SECRET` | any long random string, e.g. `openssl rand -hex 32` |
   | `CRON_SECRET` | another random string |

   `KV_REST_API_URL` and `KV_REST_API_TOKEN` are already set by the Upstash integration; the bot's once-only state lives there.
4. **Register the webhook** against the production URL:

   ```bash
   curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -d "url=https://<your-app>.vercel.app/api/telegram/webhook" \
     -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
     -d "allowed_updates[]=message"
   ```

   Check it with `getWebhookInfo`. Send `/table` in the group; the reply should arrive in a couple of seconds.
5. **Schedule the tick.** In the GitHub repository settings add the secret `CRON_SECRET` (same value as on Vercel) and the variable `APP_URL` (e.g. `https://<your-app>.vercel.app`). `.github/workflows/tick.yml` runs every five minutes and calls `/api/cron/tick`. Run it once by hand from the Actions tab and confirm the response is `{"reminder":"not-due","recap":"not-due", ...}` on a quiet day.

## How the scheduled messages work

`/api/cron/tick` reads the cached bootstrap and the current gameweek's fixtures, then:

- **Reminder** fires once when the next `deadline_time` is 30 minutes or less away. The Redis key `reminder:{gw}` is set with `SET NX` before sending, so overlapping ticks cannot both send. If GitHub's schedule slips past the deadline the reminder is skipped, never sent late.
- **Recap** fires once when every fixture in the current event has `finished_provisional: true` and FPL has not yet marked the gameweek `data_checked`. Bonus is provisional at that point, and the message says so. A postponed fixture is moved out of the event by FPL, so it does not hold the recap back. If a send fails the claim is released and the next tick retries.

The recap text comes from `services/recap.ts`, a pure function of the league snapshot. The same text is shown as a card on the gameweek page.

## Local testing

Without Telegram variables the tick route returns 503 and the webhook 401, and the once-only claims fall back to memory. To exercise a command locally without Telegram, call the formatters directly in a test, or POST a fake update:

```bash
curl -s -X POST http://localhost:3000/api/telegram/webhook \
  -H "X-Telegram-Bot-Api-Secret-Token: $TELEGRAM_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"message":{"message_id":1,"text":"/table","chat":{"id":'"$TELEGRAM_CHAT_ID"',"type":"supergroup"}}}'
```
