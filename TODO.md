# General rules

- When Implementing features, always build, run gradlew to generate new apk release.
  `npm run build && npx cap sync android `
- After building the new release, send it to the phone via adb, and install it.
  `cd android && ./gradlew assembleRelease && cd ..`
- After building use adb to install:
  `adb install -r android/app/build/outputs/apk/release/app-release.apk`
- Copy this new version of app-release to the root

# Bugs

# Features to be implemented

## Major

### Create a database to save all logs from all sessions (instead of just saving the sessions from this cycle)

Instead of using just the data from this session, use a database (it can be a simple sqlite database) for each exercise so when user is on "on train" mode it can see last times done from other cycles not just the cycle (10 weeks cycle) he is on.
This should add a new table to import and export too (and probably a new option on import/export function) for just this database.
Besides that, the last time done should show the last three times it was done, skipping the times when the user skip the exercise, and showing the series, weight, reps, RPE and comment.

### Add a timestamp to the train

So when I finish the exercise (the last set) it should save the date (day, month and year)

Small tasks:

1. Detect the transition from incomplete to complete when the last set for the last exercise is marked.
2. Persist this timestamp together with the exercise history record.
3. Show this timestamp in the compact "last time" card.

# Implemented features

## Major

### Mark Exercise as Not Done / Skipped + Auto-Done

Add an option below the series row to mark an exercise as "not done" (skipped). Clicking it marks the exercise as finished (jumps to next in OnTrain) while saving a `doneStatus` column (`done` | `undone`) in the database. If all series are completed manually, the exercise is auto-marked as `done`.

**Implemented:**

- New storage key `irontrack_done_status` (Record<workoutId, 'done' | 'undone'>)
- `markExerciseUndone()` and `markExerciseDone()` functions in useWorkoutStorage
- `toggleSet` auto-sets `doneStatus = 'done'` when all sets become complete
- `isWorkoutDone` considers undone as finished (for navigation and UI)
- ExerciseCard: "Mark as not done" button below sets (visible when active)
- ExerciseCard: amber XCircle + "Skipped" indicator when finished with undone status
- Snapshot recording triggers for both done and undone transitions
- OnTrain auto-advance works for both done and undone

### Last Time Did — Last 3 Sessions Card

Show the last 3 times an exercise was performed (instead of just the last 1) in the OnTrain bottom card.

**Implemented:**

- `getLastExerciseSnapshots()` function returning up to N snapshots (default 3)
- Updated OnTrain history card: 3 compact rows with date, load, sets, RPE
- i18n key `last_sessions` → "Last Time Did" / "Últimas Vezes"

### OnTrain First Exercise Bug Fix

When switching to OnTrain mode, the correct current exercise is now shown (no race condition between two competing effects).

**Implemented:**

- Added `onTrainPositionedRef` to prevent stale-index override on mode switch
- `firstIncompleteIndex` now skips both fully-done AND undone exercises
- Added `progress` and `doneStatus` to the mode-switch effect dependencies

### Retrive the last time I did the same exercise

I need to be able to find the last time I did the same exercise and show it in the card of the exercise beeing done. It should match the number of reps and it should shown the number of reps, number os series, weight and the date done.

Small tasks:

1. Normalize exercise names (trim, lowercase, remove accents) for stable matching.
2. Search history globally by normalized exercise name.
3. Select the most recent previous completed snapshot.
4. Show reps, sets, load, RPE and date in the bottom compact card.
5. Show the previous comment/log on a second line below metrics.

### UI Revamp (OnTrain / NoTreino) task breakdown

- Add a persisted view mode (`classic` / `ontrain`) in storage.
- Add a header toggle at the left side of Config.
- Localize toggle text: `OnTrain` in EN and `NoTreino` in PT-BR.
- Keep current stacked cards unchanged for classic mode.
- Build an OnTrain full-height exercise viewport.
- Render current day exercises as horizontal snap carousel cards.
- Keep set toggles, load, unit, RPE and note editing working in OnTrain.
- Auto-advance to next exercise when the current one is fully completed.
- Keep manual swipe navigation to go back/forward in carousel.
- Add a compact top-right next-exercise preview (name + load).
- Create exercise history types and storage map.
- Save snapshot data only on completion transition.
- Store snapshot fields: date, load, load unit, sets done/total, RPE, comment.
- Query latest previous snapshot for the focused exercise.
- Add compact bottom card with icons for load, sets and RPE in one line.
- Add previous comment/log on a second line in that bottom card.
- Add fallback text when no previous history exists.
- Add i18n keys for new labels (toggle, next preview, last session, no history).
- Run regression checks to ensure classic mode behavior is unchanged.
- Validate persistence after app reload (mode + history retained).

### UI Revamp Delta 2 (OnTrain layout + SQLite migration) task breakdown

- Move the next exercise card to a top row above the active exercise card.
- Move the exercise position indicator (`current/total` + remaining) to the same top row.
- Remove next/indicator overlays from inside the active exercise card.
- Hide Week and Day selector rows when OnTrain mode is active.
- Recalculate available OnTrain card height from viewport minus header/top row/bottom history card.
- Render active card in compact variant sized to available space.
- Remove forced card-internal scroll in normal viewport use.
- Keep bottom last-session card visible while training.
- Keep classic mode layout behavior unchanged.
- Add SQLite repository service for Android with Preferences fallback for web/dev.
- Create one-time auto migration from legacy Preferences to SQLite.
- Move all persisted app state to SQLite source of truth:
  - workouts, progress, annotations, rpe, load values + units, completion order, week/day selection, view mode, exercise history, one-rm values.
- Persist 1RM values so app close/reopen keeps data.
- Adapt import replace/merge to write/read SQLite.
- Adapt export to read from SQLite.
- Keep merge/export behavior contract unchanged.
- Validate migration with existing user data (no data loss).
- Validate OnTrain top row placement and hidden Week/Day rows.
- Validate OnTrain fit behavior and auto-advance.
- Validate classic mode regressions.

### Add a new 1RM Section to the app

Add a section that would be a button on the left side of weeks (so it should be, "1RM", "Week 1", ...,"").
This section will have three cards with each movement, "Squad", "Bench", "Deadlift" in english version, this need to have a select input weight (just "kg"), and on below lines it should have a percent of the movement total load.
The first line should be the 100% and the value input.
So the seccond line should be: "20%", and this need to calculate (and dynamic changes) the value of 20% of the 1RM writen value.
Do that for 20%, 40%, 50%, 60%, 70%, 75%, 80%, 85%, 90%, 95%.
Those cards should start contracted, on click it expand and show all those lines (from 100%, 20%, ..., 95%)

### Add a select to weight on exercises

I want to be able to select which type of measure (kg, bars, or dumb., kg, barras ou halt.).
And the weight, it should be a text input that only accepts integers (numbers from 0 to infinite).

### Add an input column using a selective input

This should measure of effort on that exercise, It should be defined number between 1 and 10. That should use by default the name "RPE".
Remember that this column could be used in an import tsv, and this need to be in the export csv too. So, by default the option should be "-", which means the user didnt select (this could be pre-selected for all exercises already done that didnt have this row fullfiled)

### Persistant notification

Now the notification keeps even after I finish

### Add an export function

Export data as csv in the same format as readed, including if the day/exercise was executed or not (create a new column for that). Make it possible to export and import a csv and when importing a training that was partially made, keep all the annotations and saved days and exercises done.

**Implemented features:**

- Export to CSV with completion status (Concluído, Séries Feitas) and annotations (Anotação)
- Settings menu added with Export and Import options
- CSV file saved to Documents directory with timestamp in filename
- Added storage permissions (WRITE_EXTERNAL_STORAGE, READ_EXTERNAL_STORAGE)
- Export shows file path/URI in success message

### Fix csv imports

Right now it reads if the file is exported as csv but renamed to ".txt", the application doesnt read .csv (it throws an error)

**Fixed:**

- Now properly accepts both .csv and .txt file extensions
- File validation simplified to check extension only
- Smart import with merge/replace option when re-importing training plans
- Preserves progress and annotations for matching exercises when merging

### Modify the prep column

When I have some content on prep column, it should grab the name of exercise (it follows a pattern, should have "Supino", "Agachamento" or "Terra", it could have more than this like "Agachamento Box", but always check if it contains those three words and ignore the rest) and calculate based on 1RM these.

So I have something like that: "Exercise: Agachamento (Pause em Baixo); Prep: 20%x8, 30%x5, 40%x5, 50%x4, 60%x2x3".
And instead of showing 20%x8, show the result of 20%\*1RM from "Agachamento", so my prep column should looks like, if 1RM of Agachamento is 100kg: "20kg x 8, 30kg x 5, 40kg x 5, 50kg x 4, 60kg x 2 x 3".

**Implemented:**

- Refactored `formatPrepWithWeights` to inline percentage replacement using regex `/\d+%/g`
- Normalized `×` to `x` and added spaces around separators (`20kgx8` → `20kg x 8`)
- Multi-set notation preserved: `60%x2x3` → `60kg x 2 x 3`
- Removed overly broad `'levantamento'` keyword from deadlift matching to avoid false positives
- Exercises without a matching 1RM or unknown movement names show raw prep text unchanged

## Minor

### Add the prep column

The prep column should appear bellow the lines "load, RPE, REPS and REST".

### Use TSV for export (decimal comma friendly)

Changed export from CSV (`,`) to TSV (`tab`) to avoid conflicts when decimal values use comma.

### Days and Weeks dones

If the day has all exercises marked as done, the day is marked as done and goes to the end of the line.
This works for weeks too with the same behavior.

### Fix week change always starts on first day

When changing weeks, it always starts showing the first day.

### Add an annotation to exercises

Below each exercise, this should be an empty text input that user could use to write.

### Working Notification

Show a notification when the app is open:

- Display the current (the top one) exercise name
- Display the current (the top one) elapsed rest time counting up (0:00, 0:01, 0:02...) sync with the cronometer from the app (if the cronometer is not active, just show 0:00)
- Visual only, no sound or vibration
- Click notification to open app

## Minor Implemented

### On RPE keep card open

When on the 1RM tab, expanding any of the three movement cards (squat, bench, deadlift) now keeps them open when switching to a week tab and back. The expansion state is lifted to `Dashboard.tsx` so it survives the `OneRmSection` unmount/remount cycle.

**Implemented:**

- Lifted `expanded` state from `OneRmSection` to `Dashboard.tsx`
- Added `expanded` and `onToggleExpanded` props to `OneRmSection`
- Cards remain expanded when switching between 1RM and week tabs

### Add back the observation text on OnExercise history card

When showing the last three times an exercise was performed in the OnTrain bottom card, it now also displays the annotation/comment text below the metrics row (load, sets, RPE).

**Implemented:**

- Added `MessageSquare` icon import to Dashboard.tsx
- Conditional render of comment line in `onTrainLastSnapshots` map when `snapshot.comment.trim().length > 0`
- Styled as `text-[10px] text-gym-400` with `truncate` to fit compact card layout

### OnTrain mode improvements

- When switching to OnTrain mode from classic, automatically shows the first exercise that is not fully completed (instead of always showing the first exercise)
- Added Previous/Next buttons below the exercise carousel for manual navigation
- Added SETS and REPS labels in the last session card for clarity

### Show reps in OnTrain last-time card

The OnTrain bottom "last time did" card was not displaying the number of reps performed in previous sessions.

**Implemented:**

- Added `BarChart2` icon import to `Dashboard.tsx`
- Added reps metric to the compact history row (load, sets, reps, RPE)
- Reps are read from `snapshot.reps` already stored in `ExerciseHistoryEntry`

# Bugfix

### Fix import losing done/undone status, comments, and exercise history

Importing a training plan that already had completed/skipped exercises and annotations was resetting the exercise history, which made the "last done" card empty. Done/undone status and comments could also be lost depending on the spreadsheet values.

**Fixed:**

- CSV parser now strips a leading UTF-8 BOM and accepts more status synonyms (`Sim`/`Yes`/`Done`/`1` for done, `Pulado`/`Skipped`/`Undone` for skipped) and comment headers (`Anotação`, `Comment`, `Observação`). `Não`/`No`/`False`/`0` now leaves the exercise active instead of marking it skipped.
- Import `replace` mode now rebuilds `exerciseHistory` from the imported finished workouts so "last done" shows weight, sets, RPE, comments, and date.
- Import `merge` mode now prefers imported comments/done-status when the imported file actually contains them, while still falling back to existing data when the cell is empty.
- Skipped/done workouts are added to `completionOrder` on import so finished sorting stays consistent.
- Built and installed release APK via adb.
