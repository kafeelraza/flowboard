# FlowBoard

FlowBoard is a realtime collaborative Kanban workspace with MongoDB persistence, Socket.io sync, board chat, AI-assisted task creation, and AI subtask breakdown.

## Live Services

- Frontend: https://flowboard-plum.vercel.app
- Backend / Realtime API: https://flowboard-realtime-api.onrender.com

Render free instances can sleep after inactivity, so the first API or websocket connection may take 30-50 seconds.

## Features

- Auth: signup/login with JWT
- Boards: create, switch, delete
- Tasks: create, edit, delete, drag between columns
- Views: Kanban board, list, calendar
- AI: natural-language task creation and subtask breakdown
- Collaboration: online members, live editing badges, realtime task sync
- Chat: board-level chat with typing indicator, read signal, reactions, edit/delete for own messages
- Permissions: owner, editor, viewer roles
- Analytics: completion, priority split, overdue count, workflow distribution
- Persistence: MongoDB Atlas snapshots plus local offline fallback queue
- Deployment: Vercel frontend, Render backend, GitHub auto-deploy

## Environment

Create `.env` locally:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
JWT_SECRET=replace_with_a_long_random_secret
FRONTEND_ORIGINS=http://127.0.0.1:5174,http://localhost:5174,https://flowboard-plum.vercel.app
```

For Vercel:

```env
VITE_REALTIME_URL=https://flowboard-realtime-api.onrender.com
```

## Local Run

```bash
npm install
npm run server
npm run dev
```

Frontend: `http://127.0.0.1:5174`
Backend: `http://127.0.0.1:4000`

## Verification Checklist

1. Sign up two users in two browsers.
2. Invite the second user to the same board.
3. Move a task in browser A and confirm browser B updates.
4. Open a task in browser A and confirm the editing badge in browser B.
5. Send a chat message and confirm realtime delivery.
6. Test typing indicator, reactions, edit/delete message.
7. Change collaborator role to Viewer and confirm board edits are blocked.
8. Resize to small laptop/mobile widths and check board, chat, and member screens.

## Key Files

- `server/index.js` - Express API, MongoDB models, auth, Socket.io, AI endpoints
- `src/components/Swift/SwiftWorkspace.jsx` - main app UI
- `src/store/middleware/socketMiddleware.js` - realtime sync bridge
- `src/store/middleware/persistMiddleware.js` - Mongo persistence and offline queue
- `src/store/middleware/historyMiddleware.js` - undo/redo timeline

## Deployment Notes

- Vercel deploys the frontend from `main`.
- Render deploys the backend from `render.yaml`.
- Keep secrets only in Vercel/Render environment variables, not in Git.
