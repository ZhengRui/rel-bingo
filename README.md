# Relationship Bingo

A social icebreaker web game for in-person meetups. Attendees get a randomized bingo board of yes/no questions about dating and relationships, then mingle to find people who answer "yes."

## Development

```bash
bun install
bun run dev -p 5000 --hostname 0.0.0.0
```

- Player: `http://localhost:5000`
- Admin: `http://localhost:5000/admin`

## Deploy on Aliyun

### 1. Create instance

Set up a spot instance from template.

### 2. Install dependencies

```bash
sudo apt update

# clone repo
git clone git@github.com:ZhengRui/rel-bingo.git
cd rel-bingo

# install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
source ~/.bashrc

# install node & bun
nvm install 24.14.0
npm install -g bun
```

### 3. Configure bun registry

Create `~/.bunfig.toml`:

```toml
[install]
registry = "https://registry.npmmirror.com"
```

### 4. Install pm2

```bash
bun add -g pm2
```

### 5. Build and serve

```bash
bun install
bun run build
~/.bun/bin/pm2 start "bun run start -p 5000 -H 0.0.0.0" --name relationship-bingo
```

### pm2 Commands

```bash
~/.bun/bin/pm2 logs relationship-bingo     # view logs
~/.bun/bin/pm2 restart relationship-bingo  # restart
~/.bun/bin/pm2 stop relationship-bingo     # stop
~/.bun/bin/pm2 delete relationship-bingo   # remove
~/.bun/bin/pm2 status                      # list all processes
```

### Note

This app uses in-memory state — all game data lives in the server process. A server restart resets the game. Do not deploy to serverless platforms (e.g. Vercel) as they don't share memory between function invocations.
