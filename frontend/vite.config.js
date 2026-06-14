import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so production assets load under Electron's file:// protocol
  // (loadFile in main.js). Absolute '/assets/...' would resolve to the drive root
  // inside the packaged app and blank the window.
  base: './',
  plugins: [react()],
})
