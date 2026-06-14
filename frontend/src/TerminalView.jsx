import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

// Predefined Font Families
const FONT_FAMILIES = {
  'Fira Code': "'Fira Code', 'Cascadia Mono', 'Consolas', monospace",
  'Cascadia Mono': "'Cascadia Mono', 'Consolas', monospace",
  'Cascadia Code': "'Cascadia Code', 'Cascadia Mono', 'Consolas', monospace",
  'Source Code Pro': "'Source Code Pro', 'Courier New', monospace",
  'Courier New': "'Courier New', Courier, monospace",
  'Consolas': "'Consolas', 'Monaco', monospace"
};

// Predefined Themes
const THEMES = {
  'dark-teal': {
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
  },
  'obsidian': {
    background: '#121212',
    foreground: '#e0e0e0',
    cursor: '#a0a0a0',
    selectionBackground: 'rgba(255, 255, 255, 0.15)',
    black: '#1e1e1e',
    red: '#cf6679',
    green: '#03dac6',
    yellow: '#f4b400',
    blue: '#3700b3',
    magenta: '#bb86fc',
    cyan: '#03dac6',
    white: '#ffffff',
    brightYellow: '#ffd54f',
    brightCyan: '#80deea',
  },
  'cyberpunk': {
    background: '#1a0826',
    foreground: '#f0e6f5',
    cursor: '#ff79c6',
    selectionBackground: 'rgba(255, 121, 198, 0.3)',
    black: '#28143a',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#6272a4',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
    brightYellow: '#ffb86c',
    brightCyan: '#a4ffff',
  },
  'matrix': {
    background: '#020a02',
    foreground: '#33ff33',
    cursor: '#00ff00',
    selectionBackground: 'rgba(0, 255, 0, 0.25)',
    black: '#051a05',
    red: '#ff0000',
    green: '#00ff00',
    yellow: '#ffff00',
    blue: '#0000ff',
    magenta: '#ff00ff',
    cyan: '#00ffff',
    white: '#33ff33',
    brightYellow: '#adff2f',
    brightCyan: '#00ffff',
  }
};

// Maps an Agent to the CLI binary launched inside its PowerShell session.
const AGENT_CLI = {
  'claude-code': 'claude',
  'antigravity-cli': 'agy',
  'codex-cli': 'codex',
};

const TerminalView = forwardRef(function TerminalView({ 
  sessionId, 
  agentId, 
  shell, 
  cwd, 
  cliAvailability, 
  onStatusChange,
  fontSize = 13,
  fontFamily = 'Fira Code',
  themeName = 'dark-teal'
}, ref) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);

  // Expose clear() to the parent.
  useImperativeHandle(ref, () => ({
    clear: () => termRef.current?.clear(),
  }), []);

  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;
  const cliAvailRef = useRef(cliAvailability);
  cliAvailRef.current = cliAvailability;

  // React to live options updates
  useEffect(() => {
    if (!termRef.current) return;
    termRef.current.options.fontFamily = FONT_FAMILIES[fontFamily] || FONT_FAMILIES['Fira Code'];
  }, [fontFamily]);

  useEffect(() => {
    if (!termRef.current) return;
    termRef.current.options.theme = THEMES[themeName] || THEMES['dark-teal'];
  }, [themeName]);

  useEffect(() => {
    if (!termRef.current || !fitAddonRef.current) return;
    try {
      termRef.current.options.fontSize = fontSize;
      fitAddonRef.current.fit();
      window.electronAPI.resizeSession(sessionId, termRef.current.cols, termRef.current.rows);
    } catch (e) {
      console.warn('[wefer] Failed resizing on font size change:', e);
    }
  }, [fontSize, sessionId]);

  useEffect(() => {
    if (!containerRef.current || !window.electronAPI) return;

    let disposed = false;
    const resolvedFontFamily = FONT_FAMILIES[fontFamily] || FONT_FAMILIES['Fira Code'];
    const resolvedTheme = THEMES[themeName] || THEMES['dark-teal'];

    const term = new Terminal({
      fontFamily: resolvedFontFamily,
      fontSize: fontSize,
      lineHeight: 1.0,
      letterSpacing: 0,
      cursorBlink: true,
      theme: resolvedTheme,
      convertEol: false,
      scrollback: 5000,
    });
    termRef.current = term;

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);

    // Keystrokes / pastes → raw passthrough to the PTY
    const dataSub = term.onData((data) => window.electronAPI.sendInput(sessionId, data));

    // Live output / exit streams
    const offData = window.electronAPI.onPtyData(({ sessionId: id, data }) => {
      if (id === sessionId) term.write(data);
    });
    const offExit = window.electronAPI.onPtyExit(({ sessionId: id }) => {
      if (id !== sessionId) return;
      term.write('\r\n\x1b[33m[wefer] Session ended.\x1b[0m\r\n');
      statusRef.current?.(agentId, 'idle');
    });

    // Font ready detection
    const fonts = document.fonts;
    const fontReady = fonts
      ? Promise.all([
          fonts.load(`${fontSize}px '${fontFamily}'`),
          fonts.load(`bold ${fontSize}px '${fontFamily}'`),
        ]).catch(() => {})
      : Promise.resolve();

    fontReady.then(() => {
      if (disposed || !containerRef.current) return;

      term.open(containerRef.current);

      try {
        const webgl = new WebglAddon();
        webgl.onContextLoss(() => webgl.dispose());
        term.loadAddon(webgl);
      } catch { /* no WebGL fallback */ }

      fitAddon.fit();

      const binary = AGENT_CLI[agentId];
      const available = binary && cliAvailRef.current && cliAvailRef.current[binary];
      const initialCommand = available ? binary : undefined;
      if (binary && !available) {
        term.write(`\x1b[33m[wefer] "${binary}" not found on PATH — starting a plain shell.\x1b[0m\r\n`);
      }

      window.electronAPI.startSession({ sessionId, agentId, cols: term.cols, rows: term.rows, initialCommand, shell, cwd });
      statusRef.current?.(agentId, 'working');
    });

    const ro = new ResizeObserver(() => {
      if (disposed) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      try {
        fitAddon.fit();
        window.electronAPI.resizeSession(sessionId, term.cols, term.rows);
      } catch { /* race logic */ }
    });
    ro.observe(containerRef.current);

    return () => {
      disposed = true;
      ro.disconnect();
      dataSub.dispose();
      offData();
      offExit();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, shell, cwd]); // Note: DO NOT add fontSize, fontFamily, themeName as deps here. They are handled by options updates.

  const resolvedTheme = THEMES[themeName] || THEMES['dark-teal'];
  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', padding: '8px', background: resolvedTheme.background, overflow: 'hidden' }}
    />
  );
});

export default TerminalView;
