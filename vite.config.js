import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// TideWatch закреплён за портом 4321, чтобы не конфликтовать с другими
// локальными проектами. strictPort = не уезжать на соседний порт при занятости.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4321,
    strictPort: true,
  },
  preview: {
    port: 4321,
    strictPort: true,
  },
})
