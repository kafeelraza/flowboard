import { Avatar } from '../common/Avatar.jsx'

export function LiveCursor({ user }) {
  if (!user.cursor) return null

  return (
    <div className="live-cursor" style={{ left: `${user.cursor.x}%`, top: `${user.cursor.y}%`, '--cursor-color': user.avatarColor }}>
      <span className="cursor-arrow" />
      <span className="cursor-label">
        <Avatar name={user.name} color={user.avatarColor} size={18} />
        {user.name}
      </span>
    </div>
  )
}
