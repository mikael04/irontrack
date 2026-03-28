# General rules

- When Implementing features, always build, run gradlew to generate new apk release.
`npm run build && npx cap sync android `
- After building the new release, send it to the phone via adb, and install it.
`cd android && ./gradlew assembleRelease && cd ..`
- After building use adb to install:
`adb install -r android/app/build/outputs/apk/release/app-release.apk`

## Bugfix

# Features to be implemented


## Major


## Add a timestamp to the train

So when I finish the exercise (the last set) it should save the date (day, month and year)

Small tasks:
1. Detect the transition from incomplete to complete when the last set is marked.
2. Generate and store a completion timestamp for that exercise snapshot.
3. Persist this timestamp together with the exercise history record.
4. Show this timestamp in the compact "last time" card.

## Minor
### Modify the prep column

The prep column for the first exercise should use the text in it and calculate the weights, use the same row design just add the weight on the right side in parenthesis.

# Implemented features

## Major

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
-  Create one-time auto migration from legacy Preferences to SQLite.
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
