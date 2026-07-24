# FlowBoard Hackathon Pitch

## Hook

Most Kanban boards make collaboration feel fragile: a teammate deletes a card,
history disappears, and offline edits become guesswork. FlowBoard treats every
change as a Redux action stream.

## Live Demo

1. Move a task between columns.
2. Show the timeline entry created automatically by middleware.
3. Undo the move, then redo it.
4. Open a second browser window and show realtime sync.
5. Open a task in one window and show the editing badge in the other.
6. Use Quick Add: `Fix navbar bug by Friday, high priority`.
7. Confirm the AI draft.
8. Open a task and use `Break down with AI`.
9. Click Analytics in the sidebar.

## Architecture

Redux action -> history middleware creates inverse action -> socket middleware
broadcasts action -> reducers update normalized state -> persist middleware saves
to Mongo or local offline queue.

## Close

FlowBoard is not just a task board. It is a small demonstration of how production
collaborative tools can structure state around reversible, broadcastable actions.
