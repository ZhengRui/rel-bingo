# Relationship Bingo

A social icebreaker web game for in-person meetups. Attendees get a randomized bingo board of yes/no questions about dating and relationships, then mingle to find people who answer "yes."

## Development

```bash
bun install
bun run dev -p 5000 --hostname 0.0.0.0
```

- Player: `http://localhost:5000`
- Admin: `http://localhost:5000/admin`

## Production Deployment

### Build

```bash
bun run build
```

### Start with pm2

```bash
bun add pm2
bunx pm2 start "bun run start -p 5000 -H 0.0.0.0" --name relationship-bingo
```

### pm2 Commands

```bash
bunx pm2 logs relationship-bingo     # view logs
bunx pm2 restart relationship-bingo  # restart
bunx pm2 stop relationship-bingo     # stop
bunx pm2 delete relationship-bingo   # remove
bunx pm2 status                      # list all processes
```

### Note

This app uses in-memory state — all game data lives in the server process. A server restart resets the game. Do not deploy to serverless platforms (e.g. Vercel) as they don't share memory between function invocations.
