# Figma OAuth Integration — Issue Recap & Solutions

## Status
Figma OAuth integration is WORKING. The rate limit lockout is temporary (resets ~4 days from Feb 21 2026). Everything else is functional.

---

## What Works
- OAuth flow: Connect with Figma → popup → approve → token stored
- Token exchange via Cloudflare Worker proxy (Basic auth method)
- File structure fetching (getFileStructure with depth=2)
- Frame/node browsing UI in NewProjectModal
- FigmaNodeConverter: Figma nodes → Loopa elements

## What Caused the Rate Limit
We burned through the Figma API quota during debugging:
- ~50+ requests in one session testing tokens, files, endpoints
- Figma uses a "leaky bucket" algorithm — burst usage causes multi-day cooldowns
- Account plan: Starter, seat: Full (Limit-Type: high)
- Full seat on Starter = 10 requests/minute (Tier 1), but overflow = days to drain

This is a ONE-TIME problem from development. Normal usage = 2 calls per import.

---

## Bugs Fixed During Integration

### 1. Token endpoint URL
- **Wrong:** `https://www.figma.com/api/oauth/token`
- **Fixed:** `https://api.figma.com/v1/oauth/token`

### 2. OAuth state parameter
- Figma requires `&state=` in the auth URL (CSRF protection)
- Generate random string, store in localStorage (NOT sessionStorage — popup can't read it)
- Verify on callback

### 3. OAuth scopes
- **Wrong:** `file_read` or `files:read` (deprecated)
- **Fixed:** `file_content:read file_metadata:read current_user:read`
- Scopes in URL must EXACTLY match scopes configured in Figma developer app settings
- Scopes are space-separated (URL encoded as +)

### 4. App must be Published
- Draft apps issue tokens that Figma rejects
- Must publish as Private (no review needed) at figma.com/developers/apps

### 5. Revoke old access after publishing
- Tokens issued while app was in Draft are permanently invalid
- Must go to figma.com/settings → Connected Apps → Remove Loopa → Reconnect

### 6. Token auth method for API calls
- **Wrong:** `X-Figma-Token` header (that's for Personal Access Tokens only)
- **Fixed:** `Authorization: Bearer {token}` header
- Worker proxy must forward `Authorization` header as-is, NOT convert to X-Figma-Token

### 7. Token exchange auth method
- **Wrong:** client_id and client_secret in POST body
- **Fixed:** `Authorization: Basic base64(client_id:client_secret)` header
- Figma's OAuth uses `client_secret_basic` auth method

### 8. Stale token after reconnect
- Popup saves new token to localStorage
- Main window must re-read from localStorage fresh after popup closes
- No module-level token caching in figmaAuth.ts or figmaApi.ts

---

## Architecture

### Cloudflare Worker (loopa-figma-proxy)
- **URL:** https://loopa-figma-proxy.hello-ed6.workers.dev
- **Purpose:** Keeps client_secret server-side, proxies Figma API calls
- **Routes:**
  - POST /auth/token — Exchange OAuth code for access token (Basic auth)
  - POST /auth/refresh — Refresh expired token (Basic auth)
  - GET /api/* — Proxy to Figma API (forwards Authorization header)
  - GET /health — Health check
  - GET /debug/config — Shows first 4 chars of secrets (remove in production)

### Secrets (set via `wrangler secret put`)
- FIGMA_CLIENT_ID: cMoM5f9rHbkDzle5BpBzvI
- FIGMA_CLIENT_SECRET: (set in worker, do NOT paste in chat)
- ALLOWED_ORIGIN: http://localhost:5173

### Frontend env (.env.local)
```
VITE_FIGMA_CLIENT_ID=cMoM5f9rHbkDzle5BpBzvI
VITE_FIGMA_PROXY_URL=https://loopa-figma-proxy.hello-ed6.workers.dev
VITE_FIGMA_MOCK=true
```

### OAuth Flow
1. User clicks "Connect with Figma"
2. Popup opens: figma.com/oauth?client_id=X&redirect_uri=X&scope=X&state=X&response_type=code
3. User approves → redirected to /auth/figma/callback?code=ABC&state=XYZ
4. FigmaCallbackView verifies state, sends code to worker POST /auth/token
5. Worker exchanges code using Basic auth → gets access_token
6. Popup saves token to localStorage, closes
7. Main window detects popup closed, reads fresh token from localStorage

### Import Flow
1. User pastes Figma file link in NewProjectModal
2. Parse fileKey + optional nodeId from URL
3. GET /api/files/{fileKey}?depth=2 → file structure (pages + frames)
4. User selects frames
5. GET /api/files/{fileKey}/nodes?ids=X,Y,Z → full node data
6. FigmaNodeConverter maps nodes → Loopa elements + frames
7. Project created, elements added to canvas

---

## Rate Limits (critical knowledge)

### Tier Table (Tier 1 = GET files, GET file nodes)
| Seat         | Starter   | Professional | Organization | Enterprise |
|-------------|-----------|-------------|-------------|------------|
| View/Collab | 6/MONTH   | 6/MONTH     | 6/MONTH     | 6/MONTH    |
| Full/Dev    | 10/min    | 15/min      | 20/min      | 20/min     |

### Key Facts
- Loopa users who CREATE designs in Figma have Full seats → 10+/min, no problem
- Viewer seats get 6/month → but viewers don't create designs to import
- Rate limits are per-user, per-plan, per-app (NOT per-file)
- Leaky bucket: burst usage causes multi-day cooldowns
- Normal import = 2 API calls. Users will never hit limits in normal use.

### Protection To Build
- Cache API responses in sessionStorage (5 min TTL)
- Debounce: never hit same endpoint twice within 1 second
- Queue multiple imports with 2s gaps
- Handle 429: read Retry-After header, show human-readable wait time
- Forward X-Figma-Plan-Tier and X-Figma-Rate-Limit-Type from worker to frontend
- Mock mode for development: VITE_FIGMA_MOCK=true → use hardcoded responses

---

## Clipboard Paste (PRIMARY import method)
Zero API calls, works on ALL Figma plans.
- User copies frame in Figma (Cmd+C) → Figma puts SVG on clipboard
- User pastes in Loopa (Cmd+V) → detect SVG → run through SvgImporter → add to canvas
- Fallback: if not SVG, use internal clipboardStore paste
- This should be the recommended flow for most users

---

## TODO When Coming Back
1. Wait for rate limit to reset (~Feb 25)
2. Set VITE_FIGMA_MOCK=false in .env.local
3. Test real import end-to-end
4. Build clipboard paste (Cmd+V SVG detection)
5. Build sync feature (re-fetch Figma nodes, update design props, keep keyframes)
6. Build proper 429 error handling with Retry-After header
7. Add API response caching
8. Add mock data for development testing
9. Remove /debug/config endpoint from worker before production