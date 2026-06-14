# One-shot CLI Runs instead of persistent PTY sessions

Wefer dispatches every command as a one-shot Run: `spawn('powershell.exe', ['-Command', cmd])` → stream stdout/stderr → process exits. There is no stdin after spawn, no persistent shell, and no daemon — an Agent is a profile plus run history, never a live process. AI CLIs are therefore always invoked in their non-interactive print modes (`claude -p`, `gemini -p`, `codex exec`).

## Considered Options

- **Persistent PTY session per agent** (node-pty + xterm.js): matches the original "daemon" UI metaphor and would allow interactive CLIs, but requires native PTY bindings on Windows, ANSI escape parsing, resize handling, and session lifecycle management — a much larger surface for the first real iteration.
- **One-shot spawn (chosen)**: simple, stateless between commands, easy to kill cleanly (`taskkill /T /F`), and sufficient because every target CLI offers a non-interactive mode.

## Consequences

- Interactive CLI usage (answering prompts, REPLs) is not possible; commands that ask for input will hang until force-terminated.
- The mock UI's daemon vocabulary ("console daemon", "Linked to Local Socket", `claude start`) is wrong under this model and must be reworded.
- The IPC contract (`run-cli-command` / `cli-output` / `cli-exit` / `kill-cli-command`) assumes a bounded process lifetime; adding sessions later means a new contract, not an extension of this one.
