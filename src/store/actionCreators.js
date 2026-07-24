export const markUndoable = (action) => ({
  ...action,
  meta: { ...action.meta, undoable: true, broadcast: true },
})

export const markBroadcast = (action) => ({
  ...action,
  meta: { ...action.meta, broadcast: true },
})
