import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

// Monospace stack. Fira Code is a ligature font, but the WebGL renderer draws
// each cell glyph independently, so ASCII sequences (->, ==, box-drawing) stay
// literal — no ligature substitution to distort terminal output.
const FONT_FAMILY = "'Fira Code', 'Cascadia Mono', 'Consolas', 'Courier New', monospace";
const FONT_SIZE = 13;

// Maps an Agent to the CLI binary launched inside its PowerShell session.
// (Agent ids stay as-is per Core scope; 'antigravity-cli' launches the `agy` binary.)
const AGENT_CLI = {
  'claude-code': 'claude',
  'antigravity-cli': 'agy',
  'codex-cli': 'codex',
};

// xterm theme mapped to the app's dark-teal palette (index.css :root vars).
const THEME = {
  background: '#000b0f',
  foreground: '#e2f1f7',
  cursor: '#94d2bd',
  selectionBackground: 'rgba(10, 147, 150, 0.35)',
  black: '#001219',
  red: '#ae2012',
  green: '#94d2bd',
  yellow: '#e9d8a6',
  blue: '#005f73',
  magenta: '#9b2226',
  cyan: '#0a9396',
  white: '#e2f1f7',
  brightYellow: '#ee9b00',
  brightCyan: '#94d2bd',
};

const TerminalView = forwardRef(function TerminalView({ sessionId, agentId, shell, cwd, cliAvailability, onStatusChange }, ref) {
  const containerRef = useRef(null);
  const termRef = useRef(null);

  // Expose clear() to the parent (the "Clear Log Console" button).
  useImperativeHandle(ref, () => ({
    clear: () => termRef.current?.clear(),
  }), []);

  // Keep latest values readable inside async callbacks without being deps.
  // cliAvailability must NOT be a dep — changes to it would dispose+recreate the
  // xterm, causing blank terminals (new xterm misses prior PTY output that was
  // already deduped by main.js).
  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;
  const cliAvailRef = useRef(cliAvailability);
  cliAvailRef.current = cliAvailability;

  useEffect(() => {
    if (!containerRef.current || !window.electronAPI) return;

    let disposed = false;
    const term = new Terminal({
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZE,
      lineHeight: 1.0,
      letterSpacing: 0,
      cursorBlink: true,
      theme: THEME,
      convertEol: false,
      scrollback: 5000,
    });
    termRef.current = term;

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Keystrokes / pastes → raw passthrough to the PTY (keyed by sessionId).
    const dataSub = term.onData((data) => window.electronAPI.sendInput(sessionId, data));

    // Live output / exit streams filtered by sessionId so each workspace's
    // terminal only receives its own PTY output.
    const offData = window.electronAPI.onPtyData(({ sessionId: id, data }) => {
      if (id === sessionId) term.write(data);
    });
    const offExit = window.electronAPI.onPtyExit(({ sessionId: id }) => {
      if (id !== sessionId) return;
      term.write('\r\n\x1b[33m[wefer] Session ended.\x1b[0m\r\n');
      statusRef.current?.(agentId, 'idle');
    });

    // Open only after the web font is loaded, so xterm measures the real glyph
    // cell — not a fallback metric — keeping columns and ASCII art aligned.
    const fonts = document.fonts;
    const fontReady = fonts
      ? Promise.all([
          fonts.load(`${FONT_SIZE}px 'Fira Code'`),
          fonts.load(`bold ${FONT_SIZE}px 'Fira Code'`),
        ]).catch(() => {})
      : Promise.resolve();

    fontReady.then(() => {
      if (disposed || !containerRef.current) return;

      term.open(containerRef.current);

      // GPU-accelerated, crisp rendering. On WebGL context loss, drop the addon
      // and let xterm fall back to its default DOM renderer rather than freeze.
      try {
        const webgl = new WebglAddon();
        webgl.onContextLoss(() => webgl.dispose());
        term.loadAddon(webgl);
      } catch { /* no WebGL → DOM renderer */ }

      fitAddon.fit();

      // Read latest cliAvailability via ref so we always get the populated value
      // even if the effect ran before the async check completed.
      const binary = AGENT_CLI[agentId];
      const available = binary && cliAvailRef.current && cliAvailRef.current[binary];
      const initialCommand = available ? binary : undefined;
      if (binary && !available) {
        term.write(`\x1b[33m[wefer] "${binary}" not found on PATH — starting a plain shell.\x1b[0m\r\n`);
      }

      // Pass sessionId and cwd so main.js spawns the PTY in the right workspace.
      window.electronAPI.startSession({ sessionId, agentId, cols: term.cols, rows: term.rows, initialCommand, shell, cwd });
      statusRef.current?.(agentId, 'working');
    });

    // Reflow on container resize and propagate the new size to the PTY.
    // Guard against zero dimensions (container hidden via display:none on inactive workspace).
    const ro = new ResizeObserver(() => {
      if (disposed) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      try {
        fitAddon.fit();
        window.electronAPI.resizeSession(sessionId, term.cols, term.rows);
      } catch { /* not opened yet / mid-teardown */ }
    });
    ro.observe(containerRef.current);

    // Cleanup: detach listeners and dispose the view. The PTY session itself is
    // NOT killed here — workspace sessions outlive their TerminalView mounts so
    // switching workspaces doesn't interrupt running processes.
    return () => {
      disposed = true;
      ro.disconnect();
      dataSub.dispose();
      offData();
      offExit();
      term.dispose();
      termRef.current = null;
    };
  }, [sessionId, shell, cwd]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', padding: '8px', background: THEME.background, overflow: 'hidden' }}
    />
  );
});

export default TerminalView;
