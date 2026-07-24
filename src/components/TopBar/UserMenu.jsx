import { LogOut, Moon, User } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { userActions } from '../../store/userSlice.js'
import { Avatar } from '../common/Avatar.jsx'

export function UserMenu() {
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const user = useSelector((state) => state.user.currentUser)

  return (
    <div className="user-menu">
      <button className="user-menu-trigger" onClick={() => setOpen((value) => !value)} title="User menu">
        <Avatar name={user.name} color={user.avatarColor} size={30} />
      </button>
      {open && (
        <div className="user-dropdown">
          <button>
            <User size={15} /> Profile
          </button>
          <button>
            <Moon size={15} /> Theme
          </button>
          <button className="danger-text" onClick={() => dispatch(userActions.logout())}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      )}
    </div>
  )
}
