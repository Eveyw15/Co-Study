# FocusFlow (Next.js Fullstack)

This is a single **Next.js** app that includes:

- 1:1 rooms (create/join with password)
- Realtime presence + chat (Socket.IO)
- 1:1 WebRTC signaling relay (Socket.IO)
- AI tutor **called from the backend** (Gemini API) so your key is not exposed

## Local run

### 1) Install

```bash
npm install
```

### 2) Create `.env.local`

```bash
GEMINI_API_KEY=...
# optional
GEMINI_MODEL=gemini-3-flash-preview

# optional: only needed if your Socket.IO server is **not** on the same origin
# NEXT_PUBLIC_SERVER_URL=https://your-signal-server.example
```

### 3) Start dev server

```bash
npm run dev
```

Open: http://localhost:3000

## Deployment notes

### Vercel

Vercel Functions do **not** support acting as a WebSocket server, so you cannot host Socket.IO signaling **inside** a Vercel deployment.

Recommended approach:

- Deploy **Next.js UI + /api/ai** on Vercel
- Deploy **Socket.IO signaling server** on a Node host that supports WebSockets
- Set `NEXT_PUBLIC_SERVER_URL` in Vercel to point to that signaling server

### Single-host deployment (simplest)

If you deploy to a platform that runs a long-lived Node process, you can deploy this repo as-is and it will serve both Next.js and Socket.IO from the same host.
# Co-Study
