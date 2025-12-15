# Public Gym App

**🚧 Work in Progress 🚧**

A fully customizable workout tracking web application for experienced lifters. Single-file React app with local storage persistence.

## Current Status

**Phase 1: Setup Wizard & Foundation** ✅ Complete
- First-launch setup wizard with 4 steps
- Custom 1-7 day workout schedule configuration
- Exercise builder with autocomplete dropdown (70+ common exercises)
- Data migration for existing users
- Backup/restore functionality

**Phase 2: Main App Refactor** 🚧 In Progress
- Updating core app to use custom workout schedules
- Dynamic day rendering (removing hardcoded Day 1/Day 2)
- Full integration of customizable exercise system

## Features

### Current (Wizard Only)
- **Custom Schedules**: Define which days of the week you work out (1-7 days)
- **Flexible Programming**: Create unique workout days or repeat the same workout multiple times per week
- **Exercise Library**: Autocomplete dropdown with 70+ common exercises, or add your own
- **Category Organization**: Group exercises by muscle groups (Upper, Lower, Push, Pull, etc.)
- **Data Persistence**: All data stored locally in your browser
- **Backup/Restore**: Export and import your workout data

### Planned (Phase 2+)
- **PR Tracking**: Automatic personal record detection and suggestions
- **Progress Charts**: Visual progress tracking for all exercises
- **Weekly History**: Complete workout history with calendar view
- **Custom Exercise Types**: Define exercises beyond standard weight/reps (bodyweight, cardio, etc.)
- Full mobile responsiveness

## Tech Stack

- React (CDN)
- Vanilla JavaScript
- localStorage for data persistence
- Single HTML file (~3,300 lines)

## Usage

Simply open `index.html` in a web browser. No build process or dependencies required.

## Development Roadmap

1. ✅ Phase 1: Setup wizard and foundation
2. 🚧 Phase 2: Core app refactoring for custom schedules
3. ⏳ Phase 3: Custom exercise types system
4. ⏳ Phase 4: Polish and mobile optimization

## License

MIT

---

**Note**: This is a public version of a personal gym tracking app, being refactored for broader use and customization.
