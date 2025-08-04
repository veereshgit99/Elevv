import path from "path" // <-- Add this import
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../Elevv-Extension/popup-build',
    emptyOutDir: true,
  },
  // --- ADD THIS ENTIRE 'resolve' BLOCK ---
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ---
})