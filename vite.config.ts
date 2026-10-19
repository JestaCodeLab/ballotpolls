import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The sitemap is made by the server but must be reachable at the site root.
    proxy: { '/api': 'http://localhost:5000', '/sitemap.xml': 'http://localhost:5000' },
  },
})
