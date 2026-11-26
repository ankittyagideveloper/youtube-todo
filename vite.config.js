import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { extractPlaylistId, fetchPlaylist } from './server/youtube.js'

// Browsers can't call YouTube directly (CORS), so a tiny middleware does it server-side.
async function handler(req, res, next) {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname !== '/api/playlist') return next()

  res.setHeader('content-type', 'application/json')
  const id = extractPlaylistId(url.searchParams.get('url'))
  if (!id) {
    res.statusCode = 400
    return res.end(JSON.stringify({ error: 'Please paste a valid YouTube playlist link.' }))
  }
  try {
    res.end(JSON.stringify(await fetchPlaylist(id)))
  } catch (err) {
    res.statusCode = 502
    res.end(JSON.stringify({ error: err.message }))
  }
}

const playlistApi = {
  name: 'playlist-api',
  configureServer(server) {
    server.middlewares.use(handler)
  },
  configurePreviewServer(server) {
    server.middlewares.use(handler)
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), playlistApi],
})
