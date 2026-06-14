const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

// node-pty is a native module; surface a load failure to the UI instead of crashing.
let pty = null;
let ptyLoadError = null;
try {
  pty = require('node-pty');
} catch (err) {
  ptyLoadError = err.message;
  console.error('[wefer] node-pty failed to load:', err.message);
}

// node-pty surfaces pipe write failures ASYNCHRONOUSLY (not as a throw from
// proc.write — verified by repro), e.g. when input lands on a PTY whose process
// just exited or was killed. Unhandled, these crash the main process with
// "A JavaScript error occurred in the main process: Error: write EAGAIN".
// Swallow ONLY these benign PTY pipe errnos; everything else stays fatal/visible.
const BENIGN_PTY_ERRORS = new Set(['EAGAIN', 'EOF', 'EPIPE', 'EIO']);
process.on('uncaughtException', (err) => {
  if (err && BENIGN_PTY_ERRORS.has(err.code)) {
    console.warn('[wefer] ignored benign PTY pipe error:', err.code, err.message);
    return;
  }
  throw err;
});

let mainWindow;

// Live PTY sessions keyed by agentId. An Agent has at most one Session.
// Value shape: { proc, shell } — shell is 'cmd' | 'powershell'.
const sessions = new Map();

// App-wide Workspace: every Session uses this as its cwd. Defaults to the user's
// home directory (e.g. C:\Users\<name>) — a neutral system location, NOT the app
// folder — until the user adds a workspace.
let currentWorkspace = app.getPath('home');

// Resolve a shell choice to its spawn config. cmd is the default base.
function shellConfig(shell) {
  if (shell === 'powershell') {
    return { file: 'powershell.exe', args: ['-NoLogo'], utf8: 'chcp 65001 > $null' };
  }
  return { file: 'cmd.exe', args: [], utf8: 'chcp 65001 >nul' };
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function killAllSessions() {
  for (const { proc } of sessions.values()) {
    try { proc.kill(); } catch { /* already gone */ }
  }
  sessions.clear();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    frame: false, // Frameless window for premium design
    backgroundColor: '#001219', // Match application theme to avoid white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Check if we are running in development mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  }

  mainWindow.on('closed', function () {
    killAllSessions();
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('before-quit', killAllSessions);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for custom title bar controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// --- PTY Session management -------------------------------------------------

// Start a Session for an Agent. sessionId = `${workspaceId}:${agentId}` so each
// workspace gets its own independent PTY — switching workspaces does NOT restart
// sessions; they run concurrently and are hidden/shown via CSS in the renderer.
ipcMain.on('session-start', (event, { sessionId, agentId, cols, rows, initialCommand, shell, cwd }) => {
  if (!pty) {
    sendToRenderer('pty-data', { sessionId, data: `\r\n[wefer] node-pty unavailable: ${ptyLoadError}\r\n` });
    sendToRenderer('pty-exit', { sessionId, exitCode: 1, signal: 0 });
    return;
  }
  const wanted = shell === 'powershell' ? 'powershell' : 'cmd';
  const spawnCwd = cwd || currentWorkspace;
  const existing = sessions.get(sessionId);
  if (existing) {
    // Same shell AND same cwd → a StrictMode re-mount, not a real request: ignore.
    if (existing.shell === wanted && existing.cwd === spawnCwd) return;
    // Shell swap → replace the PTY silently.
    try { existing.proc.kill(); } catch { /* already gone */ }
  }

  const cfg = shellConfig(wanted);
  const proc = pty.spawn(cfg.file, cfg.args, {
    name: 'xterm-color',
    cols: cols || 80,
    rows: rows || 24,
    cwd: spawnCwd,
    env: process.env,
  });

  sessions.set(sessionId, { proc, shell: wanted, cwd: spawnCwd });

  // Force UTF-8 so Thai/Unicode output streams correctly on Windows.
  proc.write(cfg.utf8 + '\r');
  if (initialCommand) proc.write(initialCommand + '\r');

  proc.onData((data) => sendToRenderer('pty-data', { sessionId, data }));
  proc.onExit(({ exitCode, signal }) => {
    const current = sessions.get(sessionId);
    if (current && current.proc === proc) {
      sessions.delete(sessionId);
      sendToRenderer('pty-exit', { sessionId, exitCode, signal });
    }
  });
});

ipcMain.on('session-input', (event, { sessionId, data }) => {
  const s = sessions.get(sessionId);
  if (s) s.proc.write(data);
});

ipcMain.on('session-resize', (event, { sessionId, cols, rows }) => {
  const s = sessions.get(sessionId);
  if (s && cols > 0 && rows > 0) {
    try { s.proc.resize(cols, rows); } catch { /* race with exit */ }
  }
});

// Kill triggers exit; the onExit handler owns Map cleanup (single exit path).
ipcMain.on('session-kill', (event, { sessionId }) => {
  const s = sessions.get(sessionId);
  if (s) {
    try { s.proc.kill(); } catch { /* already gone */ }
  }
});

// --- Workspace & CLI availability -------------------------------------------

ipcMain.handle('get-workspace', () => ({ path: currentWorkspace }));

ipcMain.handle('choose-workspace', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: currentWorkspace,
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  currentWorkspace = result.filePaths[0];
  return { path: currentWorkspace };
});

ipcMain.handle('set-workspace', (event, path) => {
  currentWorkspace = path;
  return { path: currentWorkspace };
});

function onPath(binary) {
  return new Promise((resolve) => {
    execFile('where', [binary], (err) => resolve(!err));
  });
}

ipcMain.handle('cli-availability', async () => {
  const [claude, agy, codex] = await Promise.all([
    onPath('claude'), onPath('agy'), onPath('codex'),
  ]);
  return { claude, agy, codex };
});
