---
name: start
description: Ensure the game is running. Detects an existing arcane dev instance or starts one.
allowed-tools: Bash
---

Ensure `arcane dev` is running so the user can see their game. This skill detects an already-running instance via the MCP port file and only launches a new one if needed.

## When to Use

- The user says "run the game", "start the game", "show me the game", or similar
- You need the game window open for visual verification
- MCP tools return "Game window is not running"

## Steps

### 1. Check for a running instance

```bash
if [ -f .arcane/mcp-port ]; then
  PORT=$(cat .arcane/mcp-port)
  RESP=$(curl -s -m 2 -X POST http://127.0.0.1:${PORT}/ \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"ping","id":0}' 2>/dev/null || true)
  if echo "$RESP" | grep -q '"jsonrpc"'; then
    echo "Game is already running on port ${PORT}."
    exit 0
  fi
fi
```

If the ping succeeds (response contains `"jsonrpc"`), the game is already running — report and stop.

### 2. Start arcane dev in background

If no running instance was found:

```bash
nohup arcane dev src/visual.ts > /dev/null 2>&1 &
```

### 3. Wait for the game to be ready

Poll the port file for up to 15 seconds:

```bash
for i in $(seq 1 30); do
  sleep 0.5
  if [ -f .arcane/mcp-port ]; then
    PORT=$(cat .arcane/mcp-port)
    RESP=$(curl -s -m 2 -X POST http://127.0.0.1:${PORT}/ \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"ping","id":0}' 2>/dev/null || true)
    if echo "$RESP" | grep -q '"jsonrpc"'; then
      echo "Game started successfully on port ${PORT}."
      exit 0
    fi
  fi
done
echo "ERROR: Game did not start within 15 seconds. Check for errors in arcane dev."
exit 1
```

### 4. Report to user

- On success: confirm the game window is open
- On failure: tell the user to check for TypeScript errors (`/check`) or try running `arcane dev src/visual.ts` manually in a terminal
