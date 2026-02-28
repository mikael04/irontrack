## Features to be implemented


## Implemented features

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

### Add an annotation to exercises

Below each exercise, this should be an empty text input that user could use to write.

### Working Notification

Show a notification when the app is open:
- Display the current (the top one) exercise name
- Display the current (the top one) elapsed rest time counting up (0:00, 0:01, 0:02...) sync with the cronometer from the app (if the cronometer is not active, just show 0:00)
- Visual only, no sound or vibration
- Click notification to open app