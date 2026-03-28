# UI Revamp Plan (Detailed Task Breakdown): OnTrain Mode + Last Session Card (Delta 2)

## Summary
Keep the localized mode toggle (`OnTrain` / `NoTreino`) and improve OnTrain UX:
- Move the next exercise card above the active card.
- Move the exercise position indicator above too, in the same row as next exercise.
- Remove extra blank spacing and size the active card to fit the available screen area.
- Hide Week and Day rows while OnTrain mode is active.

Also migrate persistence from Capacitor Preferences to SQLite (Android primary, web fallback), including 1RM persistence and import/export integration.

## Small Tasks

1. Update this existing `.plan/ui-revamp-ontrain.md` with delta requirements.
2. Update `TODO.md` with the delta task breakdown.
3. Keep `ViewMode`, `ExerciseHistoryEntry`, `ExerciseHistoryMap` types and wire them to SQLite storage.
4. Add 1RM persisted state type/store keys in storage layer.
5. Implement SQLite repository service (Android primary) with web Preferences fallback.
6. Add one-time auto migration from Preferences -> SQLite for existing user data.
7. Move all app persistence reads/writes from Preferences to repository APIs.
8. Preserve app behavior for workout progress, notes, RPE, loads, completion order, selection, view mode, and history.
9. Persist 1RM values and hydrate them on app load.
10. Adapt import replace/merge and export read paths to SQLite-backed data.
11. Detect completion transition (incomplete -> complete) per workout.
12. Persist history snapshot only on completion transition (not on every edit).
13. Snapshot fields: exercise name, reps, timestamp, load value + unit, sets done/total, RPE, comment.
14. Keep toggle UI in header, left of Config button.
15. Toggle label stays localized (`OnTrain` EN, `NoTreino` PT-BR).
16. Keep existing classic list rendering unchanged when mode is `classic`.
17. In OnTrain mode, hide Week/Day selector rows for more focus and space.
18. Build OnTrain top info row outside active card:
- left: `current/total` + remaining count.
- right: compact next-workout preview (name + load).
19. Remove next card and index overlays from inside the active card.
20. Recalculate OnTrain available height from viewport minus header/top row/bottom history card.
21. Render active card in compact variant sized to available height.
22. Remove forced internal card scrolling in normal use.
23. Keep same editing/set toggle behavior inside OnTrain card.
24. Keep auto-advance to next card when current workout completes.
25. Keep manual backward/forward swipe navigation.
26. Query last snapshot by exercise name (+ reps preference) for currently focused card.
27. Add/keep bottom compact last-session card with one-line metrics:
- load icon + value/unit,
- sets icon + `done/total`,
- RPE icon + value.
28. Add/keep second line in last-session card with previous comment/log text.
29. Add/keep fallback compact text when no history exists yet.
30. Add i18n keys for any new indicator/remaining labels.
31. Verify classic mode regression: week/day selection, progress, completed section.
32. Verify OnTrain behavior: top row placement, hidden Week/Day rows, proper fit, auto-advance.
33. Verify history correctness across weeks for repeated exercises.
34. Verify SQLite migration preserves existing data.
35. Verify persistence across app reload (view mode, history, 1RM).

## Interface Changes
- `types.ts`: `ViewMode`, `ExerciseHistoryEntry`, `ExerciseHistoryMap`, plus 1RM persisted state shape.
- SQLite repository/service:
  - data load/save for workouts, progress, annotations, RPE, loads, units, order, selection, view mode, history, one-rm.
  - migration API from legacy Preferences.
- `useWorkoutStorage` public additions/updates:
  - `viewMode`
  - `setViewMode(mode)`
  - `recordExerciseSnapshot(...)`
  - `getLastExerciseSnapshot(...)`
- `Dashboard` integration updates:
  - consumes mode state/actions
  - reads snapshot data for focused exercise card
  - consumes/persists 1RM values from centralized storage

## Test Scenarios
- Completion transition saves exactly one snapshot.
- Editing load/RPE/comment before completion is reflected in saved snapshot.
- Editing after completion does not create duplicate snapshots unless re-completed.
- Matching finds latest prior entry for same exercise name (normalized).
- No prior entry shows compact empty-history state.
- Mode toggle persists after reload from SQLite.
- OnTrain top row (indicator + next card) sits above active card.
- OnTrain hides Week/Day rows.
- OnTrain horizontal snap and auto-advance work with 1, 2, and many exercises.
- OnTrain card fits available area without forced internal scrolling in standard viewport.
- 1RM values persist after app close/reopen.
- Import replace/merge reads/writes SQLite correctly.
- Export reads from SQLite and preserves current output contract.
- Migration from existing Preferences to SQLite keeps user data.
- Classic stacked-card mode still behaves exactly as before.

## Assumptions / Defaults
- Storage backend now: SQLite on Android with web Preferences fallback.
- Migration strategy: automatic one-time migration from existing Preferences.
- History match scope: global by exercise name.
- Snapshot trigger: on exercise completion.
- Carousel direction: horizontal snap.
- Completion UX: auto-advance enabled.
- Toggle text localization: by current app language.
