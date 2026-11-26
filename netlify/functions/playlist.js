import { extractPlaylistId, fetchPlaylist } from '../../server/youtube.js'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export default async (req) => {
  const id = extractPlaylistId(new URL(req.url).searchParams.get('url'))
  if (!id) return json({ error: 'Please paste a valid YouTube playlist link.' }, 400)
  try {
    return json(await fetchPlaylist(id))
  } catch (err) {
    return json({ error: err.message }, 502)
  }
}

export const config = { path: '/api/playlist' }
