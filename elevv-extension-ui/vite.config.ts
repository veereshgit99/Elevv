import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // --- ADD THIS LINE ---
  base: './', // Use relative paths for assets
  build: {
    outDir: '../Elevv-Extension/popup-build',
    emptyOutDir: true,
  }
})