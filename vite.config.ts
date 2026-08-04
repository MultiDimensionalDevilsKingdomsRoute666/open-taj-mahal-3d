import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2020',
    // three + r3f + postprocessing dominate the bundle and are all needed
    // before the first frame, so splitting them buys nothing but round trips.
    chunkSizeWarningLimit: 2000,
  },
})
