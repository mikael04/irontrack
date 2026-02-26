# Agent Guidelines — React Native (Android)

## Project Overview

This is a React Native application targeting Android. The codebase uses TypeScript and follows a feature-based folder structure. All development, builds, and testing should target Android unless otherwise specified.

---

## Tech Stack

- **Framework:** React Native (Bare CLI)
- **Language:** TypeScript (strict mode)
- **Navigation:** React Navigation v6
- **State Management:** Zustand (or Redux Toolkit — update as appropriate)
- **Styling:** StyleSheet API (no third-party UI library unless noted)
- **Testing:** Jest + React Native Testing Library
- **Linting:** ESLint + Prettier
- **Build tooling:** Gradle (Android), Metro bundler

---

## Project Structure

```
src/
  components/      # Shared, reusable UI components
  screens/         # Screen-level components (one per route)
  navigation/      # Navigation stacks and tab definitions
  store/           # Zustand stores or Redux slices
  hooks/           # Custom React hooks
  services/        # API clients, third-party SDKs
  utils/           # Pure utility functions
  types/           # Shared TypeScript types and interfaces
  assets/          # Images, fonts, icons
android/           # Native Android project (Gradle)
```

---

## Development Commands

```bash
# Start Metro bundler
npx react-native start

# Run on Android (physical device or emulator)
npx react-native run-android

# Run tests
npx jest

# Run tests in watch mode
npx jest --watch

# Lint
npx eslint src/

# Type check
npx tsc --noEmit

# Build a debug APK
cd android && ./gradlew assembleDebug

# Build a release APK
cd android && ./gradlew assembleRelease
```

---

## Code Conventions

### General
- Use **functional components** exclusively. No class components.
- Prefer **named exports** for components and functions.
- Keep components **small and focused** — split into sub-components when a file exceeds ~150 lines.
- Avoid inline styles beyond trivial one-liners; use `StyleSheet.create`.

### TypeScript
- Enable `strict: true` in `tsconfig.json`.
- Never use `any`. Use `unknown` and narrow, or define a proper type.
- Co-locate types with the module they belong to; only move to `src/types/` if shared across 3+ modules.
- Use `interface` for object shapes, `type` for unions/intersections.

### Components
- Props interfaces should be named `<ComponentName>Props`.
- Destructure props at the function signature level.
- Memoize with `React.memo` only when there is a measured performance reason.
- Wrap expensive computations in `useMemo`; wrap callbacks passed to children in `useCallback`.

### State
- Keep server/async state out of Zustand — use React Query or SWR for data fetching.
- Zustand stores should be split by domain (e.g., `useAuthStore`, `useCartStore`).
- Do not put UI-only state (modal open/close, input values) into global stores.

### Navigation
- All route names should be defined as a typed `RootStackParamList` (or equivalent) enum-style object — no magic strings.
- Screens should not import from other screens directly.

---

## Android-Specific Notes

- **Minimum SDK:** 24 (Android 7.0)
- **Target SDK:** 34 (Android 14)
- **Permissions:** Declare all required permissions in `AndroidManifest.xml`. Request runtime permissions using `react-native-permissions`.
- **Back button:** Handle the hardware back button explicitly for any custom modal or overlay using `BackHandler`.
- **Deep links:** Configure intent filters in `AndroidManifest.xml` and register them in the React Navigation linking config.
- **Keyboard:** Use `KeyboardAvoidingView` with `behavior="height"` on Android (not `"padding"`).
- **ProGuard:** Keep ProGuard rules up to date when adding new native modules (`android/app/proguard-rules.pro`).
- Never commit `android/local.properties` or any `*.keystore` files.

---

## Testing

- Every new component should have a corresponding `*.test.tsx` file in the same directory.
- Test **behavior, not implementation** — assert what the user sees, not internal state.
- Mock native modules at the top of test files using `jest.mock(...)`.
- Aim for coverage on: happy path, error states, and empty/loading states.
- Snapshot tests are discouraged except for simple, stable leaf components.

---

## Git & PR Workflow

- Branch naming: `feature/<ticket-id>-short-description`, `fix/<ticket-id>-short-description`
- Commits: use [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `refactor:`, `test:`
- PRs must pass: lint, type check, and all tests before merge.
- Keep PRs focused — one logical change per PR.
- Do not commit `console.log` statements.

---

## Environment Variables

- Use `react-native-config` for environment-specific values.
- Never hardcode API keys, secrets, or base URLs.
- Maintain `.env.example` with all required keys (no real values).

---

## Performance Guidelines

- Use `FlatList` or `FlashList` for any list longer than ~20 items — never `ScrollView` with `.map()`.
- Avoid anonymous functions and object literals as props to `FlatList`'s `renderItem` and `keyExtractor`.
- Run `npx react-native info` and check for bridge-heavy operations that could be moved to worklets (Reanimated) or native threads.
- Profile with Android Studio's CPU profiler before and after optimizations.

---

## Security

- Never log sensitive user data (tokens, PII) to the console.
- Store tokens in `react-native-keychain`, not `AsyncStorage`.
- Validate and sanitize all user input before sending to an API.
- Obfuscate release builds via ProGuard/R8.

---

## Out of Scope (for this agent)

- iOS-specific native code or provisioning
- Web/browser targets
- Server-side or backend logic