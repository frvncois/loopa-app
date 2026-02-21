/**
 * figmaAuth.ts — Figma OAuth token management.
 * All API calls go through the Cloudflare Worker proxy; the client secret
 * never touches the browser.
 */

const PROXY_URL  = import.meta.env.VITE_FIGMA_PROXY_URL as string
const CLIENT_ID  = import.meta.env.VITE_FIGMA_CLIENT_ID  as string
const STORAGE_KEY = 'loopa_figma_token'

export interface FigmaTokens {
  access_token:  string
  refresh_token: string
  expires_at:    number   // Unix ms
  user_id:       string
}

// ── Persistence ────────────────────────────────────────────────

export function getFigmaTokens(): FigmaTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as FigmaTokens) : null
  } catch {
    return null
  }
}

export function saveFigmaTokens(tokens: FigmaTokens): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function clearFigmaTokens(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function isConnected(): boolean {
  const t = getFigmaTokens()
  if (!t) return false
  // Consider connected if we have a valid access token OR a refresh token to fall back on
  return !!(t.access_token && (t.expires_at > Date.now() || t.refresh_token))
}

// ── Auth URL ───────────────────────────────────────────────────

export function getAuthUrl(): string {
  const redirectUri = `${window.location.origin}/auth/figma/callback`
  const state = Math.random().toString(36).substring(2, 15)
  localStorage.setItem('figma_oauth_state', state)
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  redirectUri,
    scope:         'file_content:read file_metadata:read current_user:read',
    response_type: 'code',
    state,
  })
  return `https://www.figma.com/oauth?${params.toString()}`
}

// ── Token exchange ─────────────────────────────────────────────

export async function exchangeCode(code: string): Promise<FigmaTokens> {
  const redirectUri = `${window.location.origin}/auth/figma/callback`
  const res = await fetch(`${PROXY_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Token exchange failed: ${text}`)
  }
  const data = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
    user_id: string
  }
  const tokens: FigmaTokens = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    Date.now() + data.expires_in * 1000,
    user_id:       String(data.user_id ?? ''),
  }
  saveFigmaTokens(tokens)
  return tokens
}

// ── Token refresh ──────────────────────────────────────────────

export async function refreshToken(): Promise<FigmaTokens> {
  const existing = getFigmaTokens()
  if (!existing?.refresh_token) throw new Error('No refresh token available')

  const res = await fetch(`${PROXY_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: existing.refresh_token }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    clearFigmaTokens()
    throw new Error(`Token refresh failed: ${text}`)
  }
  const data = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  const tokens: FigmaTokens = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token ?? existing.refresh_token,
    expires_at:    Date.now() + data.expires_in * 1000,
    user_id:       existing.user_id,
  }
  saveFigmaTokens(tokens)
  return tokens
}

// ── Ensure a valid token ───────────────────────────────────────
//
// IMPORTANT: Always read from localStorage directly on each call.
// Never cache the token in a module-level variable — the OAuth popup
// saves a brand-new token to localStorage just before closing, and any
// cached value would miss it.

export async function ensureValidToken(): Promise<string> {
  // Always read fresh from localStorage — no module-level caching.
  const t = getFigmaTokens()
  if (!t) throw new Error('Not connected to Figma')

  // Token still valid (with 60s buffer)
  if (t.expires_at - 60_000 > Date.now()) return t.access_token

  // Token expired — attempt a refresh.
  if (t.refresh_token) {
    const refreshed = await refreshToken()

    // After the async refresh, re-read localStorage to detect whether a
    // newer token was saved while the refresh was in-flight (e.g. from a
    // concurrent OAuth popup). If so, use that newer token instead of the
    // refreshed one, which may itself have been overwritten.
    const latest = getFigmaTokens()
    if (latest && latest.access_token !== refreshed.access_token &&
        latest.expires_at > refreshed.expires_at) {
      return latest.access_token
    }

    return refreshed.access_token
  }

  clearFigmaTokens()
  throw new Error('Figma session expired — please reconnect')
}
