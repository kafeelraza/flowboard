import { Radio } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Avatar } from '../common/Avatar.jsx'

export function PresenceAvatars() {
  const users = useSelector((state) => state.presence.onlineUsers)
  const visibleUsers = users.slice(0, 4)
  const overflow = users.length - visibleUsers.length

  return (
    <div className="presence">
      <Radio size={17} />
      <div className="avatar-stack">
        {visibleUsers.map((user) => (
          <Avatar key={user.userId} name={user.name} color={user.avatarColor} size={26} />
        ))}
        {overflow > 0 && <span className="avatar overflow">+{overflow}</span>}
      </div>
    </div>
  )
}
