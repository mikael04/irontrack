# IronTrack

IronTrack is a personal project that acts as a workout tracking app built for Android. It lets you import training plans (aiming for powerlifting routines), mark sets and exercises as done/skipped, log weight, RPE and notes, and review your last sessions while training.

The project is a React web app packaged with Capacitor, so it can also run in a browser for development and testing.

It was built primarily using LLM-assisted "vibe coding," even though I use React, Vite, and Tailwind CSS professionally

## Features

- Import training plans from TSV/CSV files
- Export training plans with progress, status and annotations
- Track sets per exercise with tap-to-toggle indicators
- Mark exercises as skipped when you don't do them
- Log load, load unit (kg, bar, dumbbell), RPE and notes per exercise
- Last-session history card in OnTrain mode (last 3 sessions with date, load, sets, RPE and comment)
- Classic and OnTrain view modes
- 1RM calculator section for squat, bench and deadlift
- Persistent storage on Android via SQLite (Preferences fallback for web/dev)
- Portuguese and English UI

## Tech Stack

- **Framework:** React 18
- **Build tool:** Vite 5
- **Language:** TypeScript (strict mode)
- **Mobile wrapper:** Capacitor 6 (Android)
- **Styling:** Tailwind CSS
- **State / Storage:** React hooks + Capacitor Preferences / Capacitor Community SQLite
- **File handling:** Capacitor Filesystem + Capawesome File Picker
- **Icons:** Lucide React
- **Localization:** i18next / react-i18next
- **CSV/TSV parsing:** PapaParse
  ~

## Prerequisites

- Node.js 18+
- npm
- Android SDK (for Android builds)
- A physical Android device or emulator (for native testing)

## Installation

```bash
npm install
```

## Development

Run the app in the browser:

```bash
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

## Android build

1. Sync the web build with the Android project:

```bash
npm run build && npx cap sync android
```

2. Build the release APK:

```bash
cd android && ./gradlew assembleRelease && cd ..
```

3. Install on a connected Android device:

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Make sure `ANDROID_HOME` is set and the Android SDK platform and build tools are installed.

## Project Structure

```
android/              # Capacitor Android project
src/
  components/         # React components (screens, cards, UI)
  hooks/              # Custom hooks, including useWorkoutStorage
  services/           # Storage repository (Preferences + SQLite)
  utils/              # CSV/TSV parsing, export, prep calculations, helpers
  types.ts            # Shared TypeScript types
  i18n.ts             # Localization setup
  App.tsx             # Root component
public/               # Static assets
dist/                 # Vite production build output
```

## Import File Format

The app imports tab-separated values (TSV) with the following columns. A UTF-8 BOM at the start of the file is fine.

| Column                      | Description                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| Semana                      | Week number                                                                                     |
| Dia                         | Training day label (e.g. A, B, C)                                                               |
| Foco                        | Focus/muscle group                                                                              |
| Exercício                   | Exercise name                                                                                   |
| Séries                      | Total number of sets                                                                            |
| Repetições                  | Rep range                                                                                       |
| Prep                        | Warm-up / prep notation                                                                         |
| Carga %                     | Load percentage                                                                                 |
| Carga (kg)                  | Load value                                                                                      |
| Tipo de Carga (Plano)       | Planned load unit: `kg`, `bar.`, `halt.`                                                        |
| Tipo de Carga (Selecionado) | Selected load unit                                                                              |
| RPE                         | RPE value or `-`                                                                                |
| Descanso                    | Rest time                                                                                       |
| Concluído                   | `Sim`/`Yes`/`Done`/`1` = done, `Pulado`/`Skipped`/`Undone` = skipped, `Não`/`No` = not done yet |
| Séries Feitas               | Completed sets, e.g. `3/3`                                                                      |
| Anotação                    | Free-text log/comment                                                                           |

## Scripts

| Script              | Description                   |
| ------------------- | ----------------------------- |
| `npm run dev`       | Start Vite development server |
| `npm run build`     | Build production web assets   |
| `npm run preview`   | Preview the production build  |
| `npm run android`   | Sync and open Android Studio  |
| `npm run build:apk` | Build a debug APK             |

## License

This project is private and not licensed for public distribution.
