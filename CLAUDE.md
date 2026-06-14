# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Wefer AI Orchestrator** — a desktop control panel (Electron + React) for dispatching CLI commands to AI coding tools (Claude Code, Gemini CLI, Codex CLI) via real PTY terminal views, with multi-workspace support.

> **Current status:** Real PTY integration is LIVE. `main.js` owns node-pty sessions keyed by `${workspaceId}:${agentId}`. The React UI in `frontend/src/App.jsx` still contains some **mock** code (simulated logs, `runTerminalCommand`, `isRunningSimulation`) that coexists with the real PTY grid — these are flagged in `real_integration_plan.md` for removal. `real_integration_plan.md` remains the authoritative spec.

## Commands

All commands run from the repo root unless noted. The root is a CommonJS Electron package; `frontend/` is a separate ES-module Vite package with its own `package.json` and `node_modules`.

```bash
# Install (two separate installs — root + frontend)
npm install && npm install --prefix frontend

# Dev: starts Vite (port 5173) and launches Electron once the port is up
npm run dev

# Lint (frontend only — there is no root lint)
npm run lint --prefix frontend

# Build the frontend for production (outputs frontend/dist/)
npm run build-frontend

# Run Electron against an already-built frontend
npm start
```

There is **no test suite** and no root-level lint. `npm start` loads `frontend/dist/index.html`; if you haven't run `build-frontend`, prefer `npm run dev`.

## Architecture

Two processes, two packages:

- **Electron main** (`main.js`, `preload.js`, root `package.json`) — owns the frameless `BrowserWindow`, picks dev vs. prod by `app.isPackaged`, and bridges IPC. `preload.js` exposes `window.electronAPI` via `contextBridge`. `contextIsolation: true`, `nodeIntegration: false`.
- **React renderer** (`frontend/`, React 19 + Vite, `lucide-react` icons) — single-component app in `App.jsx`. Dev mode loads `http://localhost:5173`; prod loads the built bundle. State lives entirely in `App.jsx` `useState`; no router, no state library. Theme is CSS custom properties in `frontend/src/index.css` (`:root`), dark teal palette.

The dev flow (`main.js:22-30`) keys on `process.env.NODE_ENV === 'development' || !app.isPackaged`.

### PTY Session Architecture (implemented)

Sessions are managed in `main.js` via a `Map<sessionId, { proc, shell, cwd }>`. **Session key = `${workspaceId}:${agentId}`** — not just `agentId`.

Critical rules:
- **One PTY per workspace-agent pair.** Multiple workspaces may have concurrent sessions for the same agent.
- **Workspace grids hide/show via CSS `display:none`, never unmount.** Re-keying TerminalView components kills the PTY and restarts it — never do this on workspace switch.
- **`cliAvailability` must NOT be in TerminalView's `useEffect` dep array.** Use a `cliAvailRef = useRef(cliAvailability)` and read `cliAvailRef.current` inside `fontReady.then()`. Adding it as a dep causes xterm dispose→recreate when `cliAvail` populates, resulting in blank terminals (startSession is deduped, new xterm misses prior PTY output).
- **StrictMode dedup check in `session-start`:** `existing.shell === wanted && existing.cwd === spawnCwd → return early`. Same session = same shell + same cwd.
- **Default workspace `ws-default`** is auto-created from `getWorkspace()` on app startup so terminals work immediately without the user adding an explicit workspace.

### IPC contract (current)

```
preload → main:
  session-start   { sessionId, agentId, cols, rows, initialCommand, shell, cwd }
  session-input   { sessionId, data }
  session-resize  { sessionId, cols, rows }
  session-kill    { sessionId }

main → renderer:
  pty-data   { sessionId, data }
  pty-exit   { sessionId, exitCode, signal }
```

`preload.js` exposes: `startSession`, `sendInput(sessionId, data)`, `resizeSession(sessionId, cols, rows)`, `killSession(sessionId)`, `onPtyData(cb)`, `onPtyExit(cb)`.

## The mock → real transition (read before touching App.jsx or main.js)

Three documents govern this work and **must be respected**:

- **`CONTEXT.md`** — the agreed domain language. Use these terms exactly: **Agent** (a config profile + run history, *not* a live process), **Run** (one one-shot spawned process), **Output Line**, **Preset**, **Terminal Input** (raw passthrough to PowerShell), **Workspace** (app-wide cwd). It also lists banned vocabulary still present in the mock ("daemon", "socket", "session") that must be reworded.
- **`docs/adr/0001-one-shot-cli-runs.md`** — the execution model decision. Every command is **one-shot** (`spawn('powershell.exe', ['-Command', cmd])` → stream → exit). No PTY, no persistent shell, no stdin after spawn. AI CLIs are invoked in non-interactive modes only: `claude -p`, `gemini -p`, `codex exec`. Do not introduce interactive/session behavior — that would be a new IPC contract, not an extension of this one.
- **`real_integration_plan.md`** — the phased implementation plan + checklist (IPC handlers, `activeProcesses` Map, `taskkill /T /F` for tree-kill on Windows, per-agent busy state, UTF-8 output for Thai text, StrictMode listener cleanup).

### Non-obvious constraints from those docs

- **Busy state is per-Agent, never global.** The mock's single `isRunningSimulation` flag is wrong — multiple Agents may have active Runs concurrently. Derive busy from the selected Agent's `status === 'working'`.
- **Busy collision = reject, never kill.** If an Agent already has an active Run, reject the new command. Stopping a Run is only ever explicit user action (Force Terminate).
- **Kill the whole process tree.** `child.kill()` orphans grandchildren on Windows (e.g. `claude.exe` keeps burning tokens). Use `taskkill /pid <pid> /T /F`. Let the `close` handler own cleanup — single exit path.
- **No command sanitization.** Threat model = trusted local user only; pipes, `&&`, full PowerShell semantics are intentionally allowed. The only renderer-intercepted command is `clear` (wipes the selected Agent's Output Lines locally, spawns nothing).
- **`cli-exit` is a dedicated structured event** carrying the real exit code — the UI must not string-match output to detect completion.

### Mock artifacts to remove during integration (per the plan)

`antigravity-cli` agent → rename to Gemini CLI (`gemini` binary; Antigravity is an IDE, not a CLI). Mock command vocabulary (`claude commit --auto-message`, `antigravity audit`, `codex boilerplate`, `claude start`) does not exist in real CLIs. `selectAndLaunchAgent` auto-fires startup commands on select — selecting must become pure navigation. Random CPU/RAM/context stats and the two context-bound Dashboard cards are placeholders to hide until real usage parsing exists.
