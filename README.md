# Public Gym App

A fully customizable workout tracking web application. Simple, fast, and works offline.

## Status

✅ **App is complete and ready to use!**

Future updates will include new features, templates, and refinements based on user feedback.

## Features

- **Setup Wizard**: 4-step onboarding to configure your workout schedule and exercises
- **Coached Programs**: Access pre-configured workout programs if you're working with a coach
- **Custom Schedules**: 1-7 workout days per week with custom day names
- **Exercise Library**: 70+ common exercises with autocomplete, or create your own
- **Cardio Support**: Dedicated fields for cardio exercises (Intensity levels 1-15, Time tracking)
- **Sets & Rep Ranges**: Configure goal sets and rep ranges for each exercise
- **Quick Start Guide**: Tutorial walks new users through logging workouts
- **Progress Tracking**: Visual charts showing your progress over time
- **PR Streaks**: With PR tracking on, a green flame pill beside the exercise name counts consecutive improvements — the session you started from is the baseline, not a notch on the streak, so one better session after a flat stretch reads 1. It appears at one. A session extends the streak if the weight went up, or the weight held and the reps went up; it breaks on an identical session, a weight drop, or fewer reps at the same weight. A weight increase always extends it — hitting the top of your rep range bumps the weight and restarts at the bottom, so treating that as backsliding would cap every streak at the width of the range. Counts submitted sessions, so it moves on Submit Day rather than on LOG.
- **Weight Breakdown**: every exercise has a button showing two warmup sets at roughly 70% and 90% of your working weight. What it shows depends on how that machine is loaded, which you set per exercise in Settings → Manage Day N Exercises → ✏️ → How It's Loaded: **Pin-loaded** gives achievable pin and micro-plate weights, **Plate-loaded on both sides** gives an exact plate breakdown split per side, and **Plate-loaded on one side** gives the plate breakdown as a single pile. The app guesses from the exercise name to start with, and the dropdown is how you correct it — no two gyms have the same machines, and a name can't tell them apart.
- **Weekly History**: View all past workouts by week
- **Exercise Management**: Rename and reorder exercises in settings
- **Backup/Restore**: Export and import your data
- **Offline First**: All data stored locally in your browser
- **Mobile Responsive**: Optimized layouts for phone and desktop
- **Daily Accent Color**: The app's accent color changes once a day, cycling a bank of ten

## Appearance

The accent color changes once a day, the same color for everyone using the app. It is the family the whole UI hangs off — LOG buttons, active day pills, section titles, field labels, gradients, Submit Day — and it is keyed to the calendar date, so it is stable all day and flips at local midnight. There is nothing to configure and no per-user setting.

Each palette holds the original purple's exact OKLCH lightness and chroma across all six shades and rotates hue only, so every color reads as equally dark and equally desaturated, and none is harder to read than the purple was. Backgrounds never change. Green PRs, gold hints and the red NA button are fixed, since they carry meaning.

The order is reshuffled every cycle rather than being a fixed carousel, with two invariants: all ten appear before any repeats, and the same color never lands two days running. On localhost the UI still rotates but the favicon stays white, so a dev tab is never confused with the live one.

The rotation script at the top of `index.html` is kept byte-identical to the personal app's `js/accentColor.js` so the two banks cannot drift apart. It is inlined here only because this app ships as a single file.

## How It Works

1. **First Launch**: Complete the 4-step setup wizard to configure your schedule and exercises
   - Choose "Get Started" to build a custom program from scratch
   - Choose "I Have a Coach" to load a pre-configured program from your coach
2. **Log Workouts**: Enter your weight/reps, tap LOG to save each set
3. **Submit Day**: Tap "Submit Day" when finished to lock your workout
4. **Track Progress**: View history in the Weekly tab and charts in the Progress tab

## Usage

Simply open `index.html` in a web browser. No build process or dependencies required.

**Tech Stack**: Single-file React app using localStorage for data persistence

## Data & Privacy

- All data is stored locally in your browser (localStorage)
- No server, no accounts, no tracking
- Use backup/restore to save your data externally or transfer between devices

## Future Updates

Planned additions include:
- Workout templates for common programs
- Additional exercise type customizations
- Community-contributed features
