// All calls go to <VITE_API_URL>/api/... ; empty in dev (vite proxies /api to :5000).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
async function req(path, opts = {}) {
  const r = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  let body = null
  try {
    body = await r.json()
  } catch {
    body = null
  }
  if (!r.ok) {
    const msg = (body && (body.error || body.message)) || `Request failed: ${r.status} ${path}`
    throw new Error(msg)
  }
  return body
}

export const get = (path) => req(path)
export const post = (path, data) =>
  req(path, { method: 'POST', body: JSON.stringify(data ?? {}) })
export const put = (path, data) =>
  req(path, { method: 'PUT', body: JSON.stringify(data ?? {}) })
export const del = (path) => req(path, { method: 'DELETE' })
