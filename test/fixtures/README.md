# Fixtures

Real FPL API payloads captured 2 September 2026, mid-GW3 (GW2 complete, GW3 deadline Friday 4 September 17:30 UTC). Used by the Vitest suite so scoring logic is verified against real shapes instead of hand-rolled data.

| File | Endpoint | Notes |
|---|---|---|
| `bootstrap-slim.json` | `GET /api/bootstrap-static/` | Slimmed from the 1.6MB raw payload: `events` (id, name, deadline_time, is_previous, is_current, is_next, finished, data_checked, average_entry_score, highest_score), `teams` (all fields), `chips` (all fields), `game_settings.cup_start_event_id`, and `elements` reduced to id, web_name, first_name, second_name, team, element_type, code, now_cost, selected_by_percent, status, news. |
| `live-gw2.json` | `GET /api/event/2/live/` | As captured, unmodified. |
| `fixtures-gw3.json` | `GET /api/fixtures/?event=3` | As captured, unmodified. GW3 fixtures had not kicked off at capture time (all `started: false`). |
| `picks-gw2-bboost.json` | `GET /api/entry/{id}/event/2/picks/` | As captured, unmodified. This entry played Bench Boost in GW2 (`active_chip: "bboost"`), so all 15 picks carry a non-zero multiplier. `entry_history.points` is 130. |
| `history.json` | `GET /api/entry/{id}/history/` | As captured, unmodified. |

`league.json`, `h2h.json`, and `entry.json` from the same capture are deliberately not copied here — they contain real league membership, and this repo is public.
