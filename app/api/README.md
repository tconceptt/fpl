# FPL API Routes

This directory contains API routes for fetching Fantasy Premier League (FPL) data.

## Routes

### `/api/fpl/bootstrap`
- **Method:** GET
- **Purpose:** Fetches general FPL data including gameweeks, teams, and player information
- **Caching:** 5 minutes
- **Response:** Returns the complete bootstrap-static data from FPL API

### `/api/fpl/league`
- **Method:** GET
- **Purpose:** Fetches standings for your FPL mini-league
- **Caching:** 5 minutes
- **Environment Variables:** Requires `FPL_LEAGUE_ID` to be set in `.env.local`
- **Response:** Returns league standings with manager information

### `/api/fpl/manager/[id]`
- **Method:** GET
- **Purpose:** Fetches detailed information about a specific FPL manager
- **Parameters:** `id` - The manager's FPL ID
- **Caching:** 5 minutes
- **Response:** Returns combined manager info and history

### `/api/fpl/gameweek/current`
- **Method:** GET
- **Purpose:** Fetches data for the current gameweek
- **Caching:** 5 minutes
- **Response:** Returns current gameweek number and live player data

## Utility Functions

The `lib/fpl.ts` file contains helper functions and TypeScript interfaces for working with FPL data:

- `fetchWithCache`: Wrapper for fetch with built-in caching
- `calculateMovement`: Calculates rank movement (up/down/none)
- `formatPoints`: Formats point numbers with proper separators
- `getAvatarInitial`: Gets the first letter of a name for avatars

## Environment Setup

Required environment variables in `.env.local`:
\`\`\`
FPL_LEAGUE_ID=your_league_id_here
\`\`\`

## Usage Example

\`\`\`typescript
// Fetching bootstrap data
const bootstrapData = await fetch('/api/fpl/bootstrap').then(res => res.json())

// Fetching league standings
const leagueData = await fetch('/api/fpl/league').then(res => res.json())

// Fetching specific manager data
const managerId = '123456'
const managerData = await fetch(`/api/fpl/manager/${managerId}`).then(res => res.json())

// Fetching current gameweek data
const gameweekData = await fetch('/api/fpl/gameweek/current').then(res => res.json())
\`\`\` 