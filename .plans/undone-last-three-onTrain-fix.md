# Plan: Undone/Skip Toggle, Last 3 Sessions, OnTrain Current Exercise Fix

## Summary

Three features + one bugfix:

1. **Last 3 Sessions Card** — Show the last 3 times an exercise was performed in the OnTrain "last session" card (was showing only 1).
2. **Mark as Undone / Not Done** — Add a button below sets in ExerciseCard to mark an exercise as skipped/undone. Saves a `doneStatus` column (`done` | `undone`). If all series get completed → auto `done`. An undone exercise is treated as "finished" for navigation purposes.
3. **Bug: OnTrain mode doesn't jump to the correct current exercise** — When switching to OnTrain mode, there's a race condition between two `useEffect`s that fight over `onTrainIndex`. Fix the initial positioning logic.

---

## Task Breakdown

### Phase 1: New Storage Key & Types (done_status)

- [ ] 1.1 Add `WorkoutDoneStatus = Record<string, 'done' | 'undone'>` to `types.ts`
- [ ] 1.2 Add `irontrack_done_status` to `STORAGE_KEYS` in `storageRepository.ts`
- [ ] 1.3 Add `irontrack_done_status` to `LEGACY_PREFERENCES_KEYS` array
- [ ] 1.4 In `useWorkoutStorage.ts`:
  - Add `doneStatus` state (`WorkoutDoneStatus`)
  - Load `irontrack_done_status` from storage on mount
  - Add `markExerciseUndone(workoutId)` — sets `doneStatus[workoutId] = 'undone'`, persists
  - Add `markExerciseDone(workoutId)` — sets `doneStatus[workoutId] = 'done'`, persists
  - Update `toggleSet` to auto-set `doneStatus[workoutId] = 'done'` when all sets become complete
  - Update `clearData` to clear `irontrack_done_status` key
  - Update `importWorkouts` (`replace` mode) to clear `doneStatus`
  - Return `doneStatus`, `markExerciseUndone`, `markExerciseDone`

### Phase 2: Update "is done" / "finished" detection everywhere

- [ ] 2.1 In `Dashboard.tsx`:
  - Update `workoutDoneMap` to consider `doneStatus[workout.id] === 'undone'` as done
  - Update `isWorkoutDone()` callback to consider undone as done
  - Update `firstIncompleteIndex` computation (OnTrain init) to skip undone exercises
  - Update `activeWorkouts/finishedWorkouts` split — undone goes to finished
  - Snapshot recording effect: also trigger for undone transitions (record snapshot with `setsDone` as currently completed, not total)
  - Auto-advance on undone (same as on complete)

### Phase 3: ExerciseCard "Mark as Not Done" button

- [ ] 3.1 Add prop `onMarkUndone?: () => void` to `ExerciseCardProps`
- [ ] 3.2 Add prop `doneStatus?: 'done' | 'undone' | null` to display status
- [ ] 3.3 Below the set tracking section (`border-t border-gym-700`), add a new row:
  - Only visible when `!isFinished` (exercise is still active)
  - A clickable button/row: icon + text "Mark as not done" / "Marcar como não feito"
  - Compact styling matching the OnTrain variant
- [ ] 3.4 When exercise IS finished with undone status, show an undone indicator (e.g., `XCircle` icon with "Skipped" / "Não feito")
- [ ] 3.5 In `Dashboard.tsx` classic and OnTrain rendering: pass `onMarkUndone` and `doneStatus` props

### Phase 4: Last 3 Sessions Card

- [ ] 4.1 Add new hook function `getLastExerciseSnapshots(exerciseName, options, limit?: number)` in `useWorkoutStorage.ts`
  - Returns up to N snapshots (default 3), sorted newest first
  - Supports same options as `getLastExerciseSnapshot` (reps filter, excludeWorkoutId, beforeDate)
- [ ] 4.2 Update Dashboard OnTrain last-session card (lines 829-868):
  - Call `onGetLastExerciseSnapshots` (new prop) with limit=3
  - Render up to 3 compact rows instead of 1
  - Each row shows: date, load, sets done/total, RPE
  - Fallback to empty state if no history
- [ ] 4.3 Add i18n keys:
  - `last_sessions` → "Last 3 Sessions" / "Últimas 3 Sessões" (or reuse `last_session`)
  - Keep existing `last_session_empty` and `last_session_no_comment`
- [ ] 4.4 Wire `getLastExerciseSnapshots` through `DashboardProps` (in `types.ts` and `App.tsx`)

### Phase 5: OnTrain First Exercise Bug Fix

- [ ] 5.1 Root cause: Two `useEffect`s fight over `onTrainIndex` when switching to OnTrain mode
  - Effect A (line 390-405): Correctly finds `firstIncompleteIndex` and calls `goToOnTrainIndex()`
  - Effect C (line 438-442): Calls `goToOnTrainIndex(onTrainIndex)` with STALE `onTrainIndex` (the old value before Effect A's state update takes effect), overriding the correct position
- [ ] 5.2 Fix: Use a ref `onTrainInitialPositionDone` to signal that the initial positioning has been handled
  - In Effect A (mode switch handler): set the ref to `true` after calling `goToOnTrainIndex`
  - In Effect C: skip if `onTrainInitialPositionDone.current === true` (reset it in the cleanup or on next mode switch)
- [ ] 5.3 Alternatively, simplify by consolidating: have Effect C NOT run on `viewMode` change, only on `onTrainIndex` changes from user interactions. Add a condition checking `previousViewModeRef`.
- [ ] 5.4 Update `firstIncompleteIndex` logic to also consider `doneStatus` (skip undone exercises)

### Phase 6: Translation Keys

- [ ] 6.1 Add to `en` and `pt-BR` translations:
  - `mark_not_done` → "Mark as not done" / "Marcar como não feito"
  - `skipped` → "Skipped" / "Pulado"
  - `undone_exercise` → "Exercise skipped" / "Exercício não feito"
  - (Optionally rename `last_session` to something plural-friendly, or add `last_sessions` key)

---

## Interface Changes

### `types.ts` additions:
```typescript
export type DoneStatus = 'done' | 'undone';
export type WorkoutDoneStatus = Record<string, DoneStatus>;
```

### `storageRepository.ts` additions:
```typescript
doneStatus: 'irontrack_done_status',
```

### `useWorkoutStorage.ts` additions:
- New state: `doneStatus: WorkoutDoneStatus`
- New functions: `markExerciseUndone(workoutId)`, `markExerciseDone(workoutId)`
- New function: `getLastExerciseSnapshots(exerciseName, options?, limit?)`
- Modified: `toggleSet` (auto-sets done status)
- Modified: `clearData`, `importWorkouts` (clear doneStatus)
- New return values: `doneStatus`, `markExerciseUndone`, `markExerciseDone`, `getLastExerciseSnapshots`

### `ExerciseCard.tsx` additions:
- New props: `onMarkUndone`, `doneStatus`
- New UI: "Mark as not done" row below sets, undone indicator when finished

### `Dashboard.tsx` changes:
- `isWorkoutDone` considers doneStatus
- `workoutDoneMap` considers doneStatus
- `firstIncompleteIndex` skips undone exercises
- `activeWorkouts/finishedWorkouts` — undone goes to finished
- OnTrain last-session card: shows 3 rows instead of 1
- OnTrain initial positioning: fix race condition
- Snapshot effect: also handle undone transitions
- New prop: `getLastExerciseSnapshots` (passes through to Dashboard)

### `App.tsx` changes:
- Destructure new values from `useWorkoutStorage`
- Pass new props to `Dashboard`

### `i18n.ts` additions:
- `mark_not_done`, `skipped`, `undone_exercise`

---

## Test Scenarios

### Done/Undone Toggle
- Mark exercise as undone → exercise moves to "finished" section, grayed out, with "Skipped" indicator
- In OnTrain: clicking "mark as not done" advances to next exercise (same as completing all sets)
- Complete all sets → exercise is auto "done", normal green checkmark
- Undo a set after marking undone → exercise goes back to active (if we allow that)
- Undone exercise is NOT auto-advanced when sets are subsequently completed (needs re-mark)
- Persistence: doneStatus survives app restart

### Last 3 Sessions
- Exercise with 3+ prior sessions → shows 3 compact rows
- Exercise with 1 prior session → shows 1 row
- Exercise with 0 prior sessions → shows empty state
- Dates are formatted correctly per locale

### OnTrain Fix
- Switch to OnTrain with exercises partially done → first incomplete exercise is shown
- Switch to OnTrain with an undone exercise → next exercise after undone is shown
- Switch to OnTrain with ALL exercises done → last exercise is shown (or first, depending on UX decision)
- No flash of wrong exercise when switching to OnTrain

### Regression Guards
- Classic mode still works: week/day selection, progress, completed section
- Set toggle still works correctly
- Annotation, RPE, load editing still functional
- Import/export not broken by new key
- SQLite migration includes new key
