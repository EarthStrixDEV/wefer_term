<div align="center">

```
 ██╗    ██╗███████╗███████╗███████╗██████╗
 ██║    ██║██╔════╝██╔════╝██╔════╝██╔══██╗
 ██║ █╗ ██║█████╗  █████╗  █████╗  ██████╔╝
 ██║███╗██║██╔══╝  ██╔══╝  ██╔══╝  ██╔══██╗
 ╚███╔███╔╝███████╗██║     ███████╗██║  ██║
  ╚══╝╚══╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
```

### AI Orchestrator

**A desktop control panel for dispatching CLI commands to AI coding tools**
with real PTY terminal views and multi-workspace support.

[![Electron](https://img.shields.io/badge/Electron-41-47848F?style=flat-square&logo=electron&logoColor=white)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![node-pty](https://img.shields.io/badge/node--pty-1.1-339933?style=flat-square&logo=node.js&logoColor=white)](https://github.com/microsoft/node-pty)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square&logo=windows&logoColor=white)](https://microsoft.com/windows)

</div>

---

## What is Wefer?

Wefer is a **frameless desktop application** that gives you a unified control panel to drive multiple AI coding CLIs — [Claude Code](https://claude.ai/code), [Gemini CLI](https://github.com/google-gemini/gemini-cli), and [Codex CLI](https://github.com/openai/codex) — from a single dark teal interface with real embedded terminal views.

Instead of juggling multiple terminal windows, Wefer lets you:

- **Configure Agents** — named profiles for each AI tool, each with its own terminal view and run history
- **Dispatch Runs** — fire one-shot CLI commands that stream stdout/stderr in real time
- **Use Presets** — GUI buttons bound to real CLI syntax (`claude -p "..."`, `gemini -p "..."`, `codex exec "..."`)
- **Manage Workspaces** — set the working directory every Run executes in
- **Run concurrently** — multiple Agents may each have an active Run at the same time

> **Status:** Real PTY integration is **LIVE**. `main.js` manages `node-pty` sessions keyed by `${workspaceId}:${agentId}`. Some mock UI code remains in `App.jsx` pending cleanup per `real_integration_plan.md`.

---

## Domain Language

Wefer uses precise vocabulary — use these terms exactly when discussing the app:

| Term | Meaning |
|------|---------|
| **Agent** | A configuration profile (name, platform, limits) + its accumulated run history. Not a live process. |
| **Run** | A single one-shot OS process spawned for one command — streams output, then terminates. |
| **Output Line** | One streamed chunk of stdout/stderr from a Run, tagged with a type (`info`, `error`, `success`, `command`, `warning`). |
| **Preset** | A GUI button bound to a fixed real CLI command string dispatched as a Run. |
| **Terminal Input** | Raw passthrough — the typed string goes to PowerShell verbatim (except `clear`, handled locally). |
| **Workspace** | The single app-wide folder every Run uses as its working directory. |

---

## Tech Stack

### Electron Main Process
| Package | Role |
|---------|------|
| `electron` ^41 | App shell, frameless `BrowserWindow`, IPC backbone |
| `node-pty` ^1.1 | Real PTY sessions per workspace-agent pair |
| `@electron/rebuild` | Rebuilds native modules for the correct Electron ABI |
| `concurrently` | Starts Vite + Electron together in dev mode |
| `wait-on` | Holds Electron until Vite port 5173 is ready |

### React Renderer (`frontend/`)
| Package | Role |
|---------|------|
| `react` ^19 | UI framework |
| `vite` ^5 | Dev server + production bundler |
| `@xterm/xterm` ^6 | Terminal emulator component |
| `@xterm/addon-fit` | Resizes xterm to fill its container |
| `@xterm/addon-webgl` | GPU-accelerated terminal rendering |
| `lucide-react` ^1.17 | Icon set |

---

## Architecture

Two completely separate Node packages with a secure IPC bridge:

```
┌─────────────────────────────────────────────────────────────────┐
│  Electron Main Process (main.js)                                │
│                                                                 │
│  ┌─────────────────────┐    ┌──────────────────────────────┐  │
│  │   BrowserWindow      │    │   PTY Session Map            │  │
│  │   (frameless)        │    │   key: workspaceId:agentId  │  │
│  │                      │    │   { proc, shell, cwd }       │  │
│  └─────────────────────┘    └──────────────────────────────┘  │
│           │ IPC                         │                       │
│           ▼                             ▼                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  preload.js  (contextBridge)                            │   │
│  │  window.electronAPI → { startSession, sendInput,        │   │
│  │    resizeSession, killSession, onPtyData, onPtyExit }   │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │ (contextIsolation: true, nodeIntegration: false)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  React Renderer  (frontend/src/App.jsx)                         │
│                                                                 │
│  ┌───────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │  Sidebar  │  │  Agent Grid  │  │   TerminalView (xterm)  │ │
│  │  Agents   │  │  Workspaces  │  │   hide/show via CSS     │ │
│  │  Presets  │  │              │  │   never unmount          │ │
│  └───────────┘  └──────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### IPC Contract

```
Renderer → Main:
  session-start  { sessionId, agentId, cols, rows, initialCommand, shell, cwd }
  session-input  { sessionId, data }
  session-resize { sessionId, cols, rows }
  session-kill   { sessionId }

Main → Renderer:
  pty-data  { sessionId, data }
  pty-exit  { sessionId, exitCode, signal }
```

### Execution Model

Every command is a **one-shot Run**:

```
spawn('powershell.exe', ['-Command', cmd]) → stream stdout/stderr → process exits
```

AI CLIs are always invoked in non-interactive print mode:

```bash
claude -p "your prompt here"     # Claude Code
gemini -p "your prompt here"     # Gemini CLI
codex exec "your prompt here"    # Codex CLI
```

---

## Getting Started

### Prerequisites

Ensure the following are installed and available in your system `PATH`:

- **Node.js** ≥ 18 (LTS recommended)
- **Python** — required by `node-pty` native build
- **Visual Studio Build Tools** — required for native module compilation
- At least one AI CLI: `claude`, `gemini`, or `codex`

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd wefer_term

# 2. Install root (Electron) dependencies
npm install

# 3. Install frontend (React/Vite) dependencies
npm install --prefix frontend

# 4. Rebuild node-pty for your Electron version
npm run rebuild
```

### Running

```bash
# Development — starts Vite dev server (port 5173) + Electron
npm run dev

# Production — launch against the pre-built frontend bundle
npm start
```

### Building Frontend

```bash
# Build frontend/dist/ for production use with `npm start`
npm run build-frontend
```

### Linting

```bash
# ESLint for frontend only (no root-level lint)
npm run lint --prefix frontend
```

---

## PTY Session Rules

Critical invariants — violating these causes blank terminals or orphaned processes:

**Session keying**
- Session key = `${workspaceId}:${agentId}` — never just `agentId`
- One PTY per workspace-agent pair; multiple workspaces may run the same agent concurrently

**Terminal mounting**
- Workspace grids hide/show via CSS `display:none` — **never unmount**
- Re-keying `TerminalView` kills the PTY and restarts it — never do this on workspace switch

**`cliAvailability` dep array**
- **NEVER** put `cliAvailability` in `TerminalView`'s `useEffect` dependency array
- Use `cliAvailRef = useRef(cliAvailability)` and read `cliAvailRef.current` inside `fontReady.then()`
- Adding it as a dep causes xterm dispose→recreate, resulting in blank terminals

**Default workspace**
- `ws-default` is auto-created on startup so terminals work immediately without user setup

**Process termination on Windows**
- `child.kill()` orphans grandchildren (e.g. `claude.exe` keeps burning tokens)
- Use `taskkill /pid <pid> /T /F` to kill the whole process tree
- The `close` event handler owns `activeProcesses.delete()` — single exit path

**Busy state**
- Busy state is **per-Agent**, never global
- Busy collision = **reject** the new command, never silently kill the running one
- Stopping a Run is only ever explicit user action (Force Terminate)

---

## Project Structure

```
wefer_term/
├── main.js                    # Electron main — BrowserWindow, PTY sessions, IPC handlers
├── preload.js                 # contextBridge — exposes window.electronAPI to renderer
├── package.json               # Root Electron package (CommonJS)
├── CLAUDE.md                  # Architecture and implementation guidance
├── CONTEXT.md                 # Domain language — authoritative term definitions
├── real_integration_plan.md   # Phased plan: mock → real CLI integration
│
├── frontend/                  # React renderer (ES module, separate package)
│   ├── src/
│   │   ├── App.jsx            # Single-component app — all state lives here
│   │   └── index.css          # CSS custom properties, dark teal palette
│   ├── index.html
│   ├── vite.config.js
│   └── package.json           # Frontend dependencies (React, xterm, lucide-react)
│
└── docs/
    └── adr/
        └── 0001-one-shot-cli-runs.md   # Decision record: why one-shot over persistent PTY
```

---

## Supported AI CLIs

| Agent | Binary | Non-interactive Flag |
|-------|--------|---------------------|
| Claude Code | `claude` | `claude -p "..."` |
| Gemini CLI | `gemini` | `gemini -p "..."` |
| Codex CLI | `codex` | `codex exec "..."` |

CLI availability is checked once at app startup (`--version`) — agents without their CLI installed show a "not found" badge instead of a Run button.

---

## Security Model

Threat model: **trusted local user on their own machine** — same trust level as Windows Terminal.

- No command sanitization or whitelist filtering — pipes, `&&`, and full PowerShell semantics are intentionally allowed
- `cwd` is always pinned to the selected Workspace directory
- `contextIsolation: true` and `nodeIntegration: false` in the renderer
- Node.js APIs are never exposed directly — only through the typed `contextBridge` surface

---

## Roadmap / Pending Work

The `real_integration_plan.md` tracks the mock → real transition. Key items remaining:

- [ ] Replace mock `runTerminalCommand` simulation with real `window.electronAPI.runCliCommand` calls
- [ ] Remove the global `isRunningSimulation` flag (busy state is per-agent)
- [ ] Rewrite Presets to real CLI syntax (`claude -p`, `gemini -p`, `codex exec`)
- [ ] Rename `antigravity-cli` agent → Gemini CLI (correct binary: `gemini`)
- [ ] Remove auto-fired startup commands from `selectAndLaunchAgent` (select = navigate, not spawn)
- [ ] Replace random CPU/RAM/context stats with real CLI output parsing
- [ ] Reword daemon UI copy ("console daemon", "Linked to Local Socket") to match one-shot model
- [ ] UTF-8 PowerShell output for Thai/Unicode text (`chcp 65001`)
- [ ] `preload.js` IPC listener cleanup to prevent React StrictMode double-mount duplication

---

## License

ISC

---

<div align="center">

Built with Electron · React · node-pty · xterm.js

</div>
