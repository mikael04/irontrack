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

- Change the UI

### Add an input column using a selective input

This should measure of effort on that exercise, It should be defined number between 1 and 10. That should use by default the name "RPE".
Remember that this column could be used in an import tsv, and this need to be in the export csv too. So, by default the option should be "-", which means the user didnt select (this could be pre-selected for all exercises already done that didnt have this row fullfiled)

**Implemented features:**
- Added RPE (Rating of Perceived Exertion) input column with selectable values 1-10
- Default value is "-" (not selected)
- RPE values persist locally and are included in TSV exports
- User can select RPE for each exercise via dropdown in ExerciseCard
- Values are preserved during import/merge operations

## Minor
### Add the prep column

The prep column should appear bellow the lines "load, RPE, REPS and REST".

### 


# Implemented features

## Major

## Persistant notification

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
