# Wefer AI Orchestrator

A desktop control panel (Electron + React) for dispatching one-shot CLI commands to AI coding tools (Claude Code, Gemini CLI, Codex CLI) and streaming their output into per-agent terminal views.

## Language

**Agent**:
A configuration profile (name, platform, limits) plus its accumulated run history and logs — not a live process.
_Avoid_: Daemon, session, bot

**Run**:
A single one-shot OS process spawned for one command; it streams output and terminates on its own.
_Avoid_: Task, simulation, session

**Output Line**:
One streamed chunk of stdout/stderr from a Run, tagged with a type (info, error, success, command, warning).
_Avoid_: Log entry, message

**Preset**:
A GUI button bound to a fixed, real CLI command string (e.g. `claude -p "..."`) dispatched as a Run for the selected Agent.
_Avoid_: Quick task, shortcut, operation

**Terminal Input**:
A raw passthrough — the typed string is sent to PowerShell verbatim, exactly like a normal terminal; the sole exception is `clear`, handled locally (wipes the selected Agent's Output Lines, spawns nothing).
_Avoid_: Query, prompt box

**Workspace**:
The single app-wide folder that every Run uses as its working directory, chosen by the user via a folder picker.
_Avoid_: Project, repo, cwd (in UI copy)

## Relationships

- An **Agent** has at most one active **Run** at a time
- Multiple **Agents** may each have an active **Run** concurrently; busy state is per-Agent, never global
- A **Run** produces zero or more **Output Lines** and ends with exactly one exit event carrying the real exit code
- **Output Lines** are stored per **Agent**, surviving across **Runs**

## Example dialogue

> **Dev:** "When the user clicks an **Agent** card, do we boot up its daemon?"
> **Domain expert:** "There is no daemon — clicking dispatches a one-shot **Run**. The **Agent** itself is just a profile; nothing is 'alive' between **Runs**."

## Flagged ambiguities

- "daemon" appeared throughout the mock UI ("console daemon", "Linked to Local Socket", `claude start`) — resolved: dropped from the domain. Agents are profiles, not live processes. UI copy referencing daemons/sockets must be reworded during real integration.
- "Antigravity CLI" was the mock name for the Google agent — resolved: the real binary is `gemini` (Gemini CLI); Antigravity is an IDE, not a CLI. The agent/platform must be renamed to Gemini CLI.
- Mock command vocabulary (`claude commit --auto-message`, `antigravity audit --security`, `codex boilerplate`) does not exist in the real CLIs — resolved: Presets are rewritten to real non-interactive syntax (`claude -p "..."`, `gemini -p "..."`, `codex exec "..."`).
