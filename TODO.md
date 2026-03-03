# General rules

- When Implementing features, always build, run gradlew to generate new apk release.
`npm run build && npx cap sync android `
- After building the new release, send it to the phone via adb, and install it.
`cd android && ./gradlew assembleRelease && cd ..`

# Bugfix

## Persistant notification

Now the notification keeps even after I finish 

# Features to be implemented

## Major

Change the UI

## Minor
### Add the prep column

The prep column should appear bellow the lines "load, RPE, REPS and REST".


# Implemented features

## Major

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
