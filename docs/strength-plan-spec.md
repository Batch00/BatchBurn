# BatchBurn strength plan: as built

Shipped to `main` on Nov 13 2026 (`6e2395b`). This replaces the original build spec and describes what exists now. The working rules for future changes are in the "Strength Plan" section of `CLAUDE.md`.

## What it does

Workouts that are not tracked on the watch (lifting, stretching) follow a weekly routine. The plan lays that routine out for the week, and each session is confirmed with one tap. A confirmed session becomes a normal activity, so it shows in History, the activity feed, Analytics and BatchBrain.

## Decisions

| Topic | Decision |
|---|---|
| Detail level | A routine is a name, typical minutes, an activity type and default weekdays. No exercises, sets, reps or weights |
| Logging | Never automatic. A workout is recorded only when its session is confirmed |
| Stretching | A normal routine with its own activity type, `Stretching`. The first version used "add-ons" ticked onto a session; that was removed |
| Weeks | Sunday to Saturday, for the plan only. KPIs, goals and charts still use Monday weeks |
| Catch-up | The current and previous week can be edited. Older weeks are read only and show unconfirmed sessions as missed |
| Cardio | Not planned here. Runs and other watch activities arrive from the Garmin import and show on the week as read-only chips |
| Moving | Drag between days on desktop. On touch, the session details have seven day buttons |
| Phones | The week is a sideways strip that snaps to days and opens on today |

## Data model

Two tables in the `batchburn` schema, both owner-scoped with RLS.

- `routines`: `name`, `default_minutes`, `activity_type`, `weekdays` (ISO days, 1 = Monday, 7 = Sunday), `is_active`, `sort_order`.
- `planned_sessions`: `routine_id`, `routine_name` and `activity_type` (snapshots), `week_start` (the Sunday), `slot_weekday` (null for sessions added by hand), `date`, `minutes`, `status` (`planned`, `done`, `skipped`), `cross_training_id`. Unique on `(user_id, routine_id, week_start, slot_weekday)`.

SQL files, all already run against production:

1. `supabase/migrations/add_strength_plan.sql`: creates both tables.
2. `supabase/manual/strength_plan_sunday_weeks.sql`: one-time re-key from Monday weeks to Sunday weeks.
3. `supabase/migrations/strength_plan_round2.sql`: adds the `Stretching` type and `activity_type` columns, removes add-ons.
4. `supabase/migrations/strength_plan_demo_grants.sql`: lets the demo reset function write to both tables.

## Behavior

- **Generating the week.** When the plan loads, the browser upserts one session per active routine and default weekday for the current and previous week, ignoring conflicts on the unique key. Moved or skipped sessions are never recreated. The demo account never writes.
- **Confirm.** One tap on a session dated today or earlier. Inserts a `cross_training` row with the session's activity type, `source = 'manual'` and the routine name as the note, then links it. If an unclaimed `garmin_csv` row of the same type exists on that date, the session links to it instead. "Confirm all" does this for every planned session up to today in the week shown.
- **Undo.** Deletes the linked row only when its source is `manual`; a Garmin row is just unlinked. A done session whose activity was deleted from History shows as planned again.
- **Details.** Tapping a session name opens minutes, the seven day buttons and Save. Generated sessions can be skipped; sessions added by hand can be removed.
- **Routine edits.** Removing a day from a routine deletes its unmoved, still-planned sessions on that day in the current and previous week.

## Screens

- **Dashboard card.** Above the KPI cards, with arrows to step back through past weeks. With no routines it shrinks to a one-line link to the Plan page.
- **Plan page, `/plan`.** The same week view plus routine management.

Both use `components/plan/WeekPlan.tsx`. Mileage KPIs, the weekly chart and goal rings are unchanged, because planned activities have no distance.

## Demo account

The nightly `reset-demo-batchburn` function wipes and re-seeds the demo plan: four routines, with sessions for this week and last week. Days before today are done and linked to a matching activity; today and later are planned. The function must be redeployed to Supabase after any change to it.

## Known gaps

- The database does not block the demo account from writing to the two plan tables; the app hides the controls and the nightly reset clears anything written.
- Touch devices cannot drag sessions. They use the day buttons.
- There is no month calendar and no session-count goal type.
- On Sundays the plan shows a new week while the mileage numbers still show the previous Monday week.
