const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return
  visit(node)
  for (const value of Object.values(node)) walk(value, visit)
}

export function extractPlaylistId(input) {
  const text = String(input ?? '').trim()
  if (/^(PL|UU|LL|FL|OL|RD)[\w-]{10,}$/.test(text)) return text
  try {
    return new URL(text).searchParams.get('list')
  } catch {
    return null
  }
}

function collect(data, videos, seen) {
  let token = null
  walk(data, (node) => {
    const lockup = node.lockupViewModel
    if (lockup?.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO' && lockup.contentId) {
      if (seen.has(lockup.contentId)) return
      seen.add(lockup.contentId)
      const sources = lockup.contentImage?.thumbnailViewModel?.image?.sources ?? []
      videos.push({
        id: lockup.contentId,
        title: lockup.metadata?.lockupMetadataViewModel?.title?.content ?? 'Untitled video',
        thumbnail: sources[sources.length - 1]?.url ?? `https://i.ytimg.com/vi/${lockup.contentId}/hqdefault.jpg`,
        duration:
          lockup.contentImage?.thumbnailViewModel?.overlays
            ?.flatMap((o) => o.thumbnailBottomOverlayViewModel?.badges ?? [])
            .map((b) => b.thumbnailBadgeViewModel?.text)
            .find(Boolean) ?? '',
      })
    }
    const continuation = node.continuationItemViewModel?.continuationCommand?.innertubeCommand?.continuationCommand?.token
    if (continuation) token = continuation
  })
  return token
}

export async function fetchPlaylist(playlistId) {
  const page = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}&hl=en`, {
    headers: { 'accept-language': 'en-US,en;q=0.9', 'user-agent': UA, cookie: 'CONSENT=YES+1; SOCS=CAI' },
  })
  const html = await page.text()
  const raw = html.match(/var ytInitialData = (.*?);<\/script>/s)?.[1]
  if (!raw) throw new Error('Could not read the playlist page.')
  const data = JSON.parse(raw)

  const title = data.metadata?.playlistMetadataRenderer?.title
  if (!title) throw new Error('Playlist not found. Make sure it is public or unlisted.')

  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1]
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1]
  const visitorData = html.match(/"visitorData":"([^"]+)"/)?.[1]

  const videos = []
  const seen = new Set()
  let token = collect(data, videos, seen)

  for (let i = 0; token && apiKey && i < 100; i++) {
    const res = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': UA },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion, hl: 'en', visitorData } },
        continuation: token,
      }),
    })
    if (!res.ok) break
    token = collect(await res.json(), videos, seen)
  }

  return { id: playlistId, title, videos }
}
