const { contextBridge, ipcRenderer } = require('electron');

// Expose safe Electron APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls (frameless title bar)
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // PTY session control
  startSession: (payload) => ipcRenderer.send('session-start', payload),
  sendInput: (sessionId, data) => ipcRenderer.send('session-input', { sessionId, data }),
  resizeSession: (sessionId, cols, rows) => ipcRenderer.send('session-resize', { sessionId, cols, rows }),
  killSession: (sessionId) => ipcRenderer.send('session-kill', { sessionId }),

  // Workspace & CLI detection
  chooseWorkspace: () => ipcRenderer.invoke('choose-workspace'),
  getWorkspace: () => ipcRenderer.invoke('get-workspace'),
  setWorkspace: (path) => ipcRenderer.invoke('set-workspace', path),
  checkCliAvailability: () => ipcRenderer.invoke('cli-availability'),

  // PTY event streams — each returns an unsubscribe fn (required for StrictMode cleanup)
  onPtyData: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('pty-data', handler);
    return () => ipcRenderer.removeListener('pty-data', handler);
  },
  onPtyExit: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('pty-exit', handler);
    return () => ipcRenderer.removeListener('pty-exit', handler);
  },
});
