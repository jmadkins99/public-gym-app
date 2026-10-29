# Public Gym App

A customizable workout tracker for coaching clients. Live at
https://jmadkins99.github.io/public-gym-app/

Personal counterpart: [gym-tracker](https://github.com/jmadkins99/gym-tracker).

## Features

- **Setup wizard**: 1–7 workout days with custom names, exercises from an
  ~80-name word bank or your own. A coach code instead loads a preset program
  (`js/clients.js`).
- **Logging**: one card per exercise, pre-filled from last session; LOG saves
  each exercise, Submit Day closes the day.
- **Reps dropdown**: built from each exercise's goal range, one below min reps
  up to max reps. The bottom value is a failed set and never counts as a PR.
- **Progression** (coached programs with PR tracking): hit max reps and the next
  weight is suggested, stepped by the exercise's PR increment (1.25, 2.5, 5 or
  10 lb).
- **PRs**: badges on logged cards, Submit Day and History. Some coached programs
  also show a flame streak pill.
- **Weight Breakdown**: warmup sets at ~70% and ~90%, per load type (pin-loaded,
  plates on both sides, plates on one side). Opening it starts the exercise's
  timer.
- **Session timing**: per-exercise and total time, in Submit Day and History.
- **History**: past workouts by week, each day editable.
- **Cardio** exercises with intensity and time fields.
- **Daily accent color** from a bank of ten.

## Data

- Stored in the browser's `localStorage`. Most clients use only this.
- Optional Google sign-in (Settings) syncs to Firebase Firestore.
- Export/import a JSON backup from Settings.

## Tech stack

- React 18 and Babel standalone from a CDN, no build step.
- Firebase 10 (Auth + Firestore) for sign-in and sync.
- GitHub Pages, deployed by `.github/workflows/tests.yml` on each merge to
  `main`. A pull request can only merge once that workflow's tests pass.
- Puppeteer end-to-end tests in `tests/`.

## Development

Needs Python, Node and Chrome.

```bash
python -m http.server 8001   # then open http://localhost:8001/
cd tests && bash run.sh      # full test suite; installs its npm packages
```

Served from `localhost`, the app uses its own `gym-local:` storage, so it never
touches live data.
