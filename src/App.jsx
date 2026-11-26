import { useEffect, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'playlist-todos'

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return { playlists: saved?.playlists ?? [], done: saved?.done ?? {} }
  } catch {
    return { playlists: [], done: {} }
  }
}

function App() {
  const [state, setState] = useState(loadState)
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { playlists, done } = state

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  async function addPlaylist(e) {
    e.preventDefault()
    if (!link.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/playlist?url=${encodeURIComponent(link.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setState((s) => ({
        ...s,
        playlists: [...s.playlists.filter((p) => p.id !== data.id), data],
      }))
      setLink('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function toggle(playlistId, videoId) {
    setState((s) => {
      const current = { ...s.done[playlistId] }
      if (current[videoId]) delete current[videoId]
      else current[videoId] = true
      return { ...s, done: { ...s.done, [playlistId]: current } }
    })
  }

  function removePlaylist(playlistId) {
    setState((s) => {
      const rest = { ...s.done }
      delete rest[playlistId]
      return { playlists: s.playlists.filter((p) => p.id !== playlistId), done: rest }
    })
  }

  return (
    <main className="app">
      <div className="hero">
        <h1>Playlist Todo</h1>
        <p className="subtitle">Paste a YouTube playlist link and tick off each video as you finish it.</p>
      </div>

      <form className="add-form" onSubmit={addPlaylist}>
        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://youtube.com/playlist?list=..."
          aria-label="YouTube playlist link"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading…' : 'Add playlist'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}

      {playlists.length === 0 && (
        <div className="empty">
          <p>No playlists yet. Add one above to get started.</p>
        </div>
      )}

      {playlists.map((playlist) => {
        const checked = done[playlist.id] ?? {}
        const count = playlist.videos.filter((v) => checked[v.id]).length
        const percent = playlist.videos.length ? (count / playlist.videos.length) * 100 : 0
        return (
          <section key={playlist.id} className="playlist">
            <header>
              <h2>{playlist.title}</h2>
              <button type="button" className="remove" onClick={() => removePlaylist(playlist.id)}>
                Remove
              </button>
            </header>
            <div className="progress-row">
              <span>
                <strong>{count}</strong> / {playlist.videos.length} completed
              </span>
              <span>{Math.round(percent)}%</span>
            </div>
            <div className="progress">
              <div style={{ width: `${percent}%` }} />
            </div>

            <ul className="cards">
              {playlist.videos.map((video, i) => (
                <li key={video.id} className={`card${checked[video.id] ? ' done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={!!checked[video.id]}
                    onChange={() => toggle(playlist.id, video.id)}
                    aria-label={`Mark "${video.title}" as done`}
                  />
                  <a
                    className="thumb"
                    href={`https://www.youtube.com/watch?v=${video.id}&list=${playlist.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img src={video.thumbnail} alt="" loading="lazy" />
                    {video.duration && <span>{video.duration}</span>}
                  </a>
                  <div className="info">
                    <span className="index">#{i + 1}</span>
                    <a
                      href={`https://www.youtube.com/watch?v=${video.id}&list=${playlist.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {video.title}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}

export default App
