# Relationship Bingo - Game Design

## Overview

A social icebreaker web game for in-person meetups. Attendees open the game on their phones, get a randomized bingo board of yes/no questions about dating/relationships, and mingle to find people who answer "yes." The host projects an admin dashboard showing a live leaderboard.

## Game Flow

1. Admin configures game: grid size N (default 3), game mode, time limit T, questions JSON
2. Admin starts the game (timer begins)
3. Players join by entering a unique nickname on their phone
4. Each player sees an n*n board with randomized question order
5. Players tap cells, see questions, ask people around them, and record who said yes
6. Admin dashboard shows live leaderboard with mini-grids per player
7. Game ends when: timer expires, or admin manually ends it
8. Host invites top-ranked players to stage for sharing

## Architecture

Single Next.js app with two client-side flows and API routes. All state lives in server memory (no database). This is a single-event tool — server restart resets the game.

### Routes

```
Player:   /           -> nickname registration
          /play       -> board + question popups
Admin:    /admin      -> game setup (N, mode, T, questions)
          /admin/dashboard -> leaderboard with mini-grids
```

### API Endpoints

| Endpoint       | Method | Request                              | Response                              |
|----------------|--------|--------------------------------------|---------------------------------------|
| `/api/setup`   | POST   | `{ n, mode, timeLimit, questions[] }`| `{ success }`                         |
| `/api/start`   | POST   | -                                    | `{ success, startedAt }`              |
| `/api/join`    | POST   | `{ nickname }`                       | `{ board: number[], questions[] }`    |
| `/api/solve`   | POST   | `{ nickname, cellIndex, answeredBy }`| `{ success }`                         |
| `/api/end`     | POST   | -                                    | `{ success }`                         |
| `/api/state`   | GET    | -                                    | Full game state for admin dashboard   |

## Data Model

```typescript
Game {
  config: {
    n: number              // grid size (default 3)
    mode: "leaderboard" | "bingo"
    timeLimit: number      // T in minutes
    questions: string[]    // first n^2 questions from uploaded JSON
  }
  status: "setup" | "active" | "ended"
  startedAt: timestamp | null
  players: Map<nickname, Player>
}

Player {
  nickname: string
  joinedAt: timestamp
  board: number[]          // shuffled indices into questions array
  solves: Map<cellIndex, {
    answeredBy: string     // name of person who said yes
    solvedAt: timestamp
  }>
  hasBingo: boolean
  bingoAt: timestamp | null
}
```

### Questions JSON Format

```json
["Have you ever been on a blind date?", "Do you believe in love at first sight?", ...]
```

Simple string array. First n^2 entries are used.

## Player UI

### Join Screen (`/`)

- Centered form: nickname input + "Enter Game" button
- Error if nickname taken
- "Waiting for game to start..." state after joining if game not yet active

### Board Screen (`/play`)

- n*n grid filling phone screen
- Unsolved cells: neutral style, short label (e.g. "Q1"), tappable, no question text
- Solved cells: green background + checkmark + name of who said yes

### Question Popup (full-screen overlay)

- Question text displayed prominently
- Text input for the person's name
- "Found it!" button to submit
- Tap outside or X to close without solving
- Already-solved cells show as read-only

No timer display or game-over notification on player side — host announces verbally.

## Admin UI

### Setup Screen (`/admin`)

- N input (default 3)
- Game mode: "Leaderboard" or "Bingo"
- Time limit T (minutes)
- Questions JSON file upload (or paste)
- Validation: must have >= n^2 questions
- "Start Game" button

### Dashboard Screen (`/admin/dashboard`)

- Polls `/api/state` every 2-3 seconds
- Top bar: game mode, countdown timer, "End Game" button
- Leaderboard: ranked list of players, each with:
  - Rank number
  - Nickname
  - Solve count (e.g. "5/9")
  - Mini n*n grid (green = solved, gray = unsolved)
  - Bingo mode: celebration effect on players who achieved bingo

### Ranking Logic

- **Leaderboard mode**: sort by solve count (desc), then last solve timestamp (asc)
- **Bingo mode**: bingo achievers on top (sorted by bingo timestamp asc), then others by solve count (desc)

## Bingo Detection

Checked server-side on every `/api/solve` call.

- Board is n*n, cells indexed 0 to n^2-1, row by row
- Row i: cells `[i*n .. i*n+(n-1)]`
- Column j: cells `[j, j+n, j+2n, ...]`
- Main diagonal: `[0, n+1, 2*(n+1), ...]`
- Anti-diagonal: `[n-1, 2*(n-1), 3*(n-1), ...]`
- Any complete line = bingo
- `bingoAt` timestamp set once on first bingo achievement

## Tech Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- No database, no external services

## Project Structure

```
src/
  app/
    page.tsx                    # Player join screen
    play/page.tsx               # Player board
    admin/page.tsx              # Admin setup
    admin/dashboard/page.tsx    # Admin dashboard
    api/setup/route.ts
    api/start/route.ts
    api/join/route.ts
    api/solve/route.ts
    api/end/route.ts
    api/state/route.ts
    layout.tsx
    globals.css
  lib/
    game-store.ts               # In-memory game state singleton
    bingo.ts                    # Bingo detection logic
```

## Design Decisions

- **In-memory state**: No database needed for a single-event game. Simple and fast.
- **Polling over SSE/WebSocket**: Only the admin dashboard polls. One client every 2-3s is trivially light. Server timestamps ensure correctness regardless of polling delay.
- **Honor system**: No in-app verification of "who said yes." Verification happens socially on stage.
- **No player-side notifications**: Host announces game start/end verbally. Keeps player UI simple.
- **Randomized board per player**: Each player gets the same questions but in different cell positions, preventing players from copying each other.
