# FlowBoard

Collaborative Kanban board built to demonstrate advanced Redux Toolkit patterns:
undo/redo history, realtime socket sync, AI-assisted task creation, offline queueing,
and Mongo-backed persistence when configured.

## Run

```bash
npm install
npm run mongo:start
npm run server
npm run dev
```

Frontend runs on `http://127.0.0.1:5174`.
Backend runs on `http://127.0.0.1:4000`.

## Environment

Copy `.env.example` to `.env` and fill values:

```env
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
MONGO_URI=mongodb://127.0.0.1:27017/flowboard
JWT_SECRET=replace_this_with_a_long_random_secret
```

If MongoDB is not running, the server falls back to in-memory persistence.
If Groq is not configured, AI endpoints fall back to deterministic heuristics.

Local Mongo data is stored in `mongo-data/` and logs in `mongo-log/`.

## Demo Script

1. Open two browser windows at `http://127.0.0.1:5174`.
2. Move a card and watch the second window sync.
3. Open a task and confirm the remote editing badge.
4. Use Undo/Redo and the History panel jump.
5. Type `Fix navbar bug by Friday, high priority` in Quick Add and confirm the AI draft.
6. Open a task and use `Break down with AI`.
7. Turn off network briefly, make a board change, reconnect, and let the offline queue flush.

## Key Files

- `src/store/middleware/historyMiddleware.js` - undo/redo and timeline jump
- `src/store/middleware/socketMiddleware.js` - realtime action/presence sync
- `src/store/middleware/persistMiddleware.js` - backend save + offline queue
- `server/index.js` - Express, Socket.io, Mongo/JWT, Groq endpoints
