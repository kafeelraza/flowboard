import { Eye, EyeOff, KanbanSquare, LogIn, Sparkles, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { userActions } from '../../store/userSlice.js'

export function AuthGate() {
  const dispatch = useDispatch()
  const status = useSelector((state) => state.user.authStatus)
  const error = useSelector((state) => state.user.authError)
  const [mode, setMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  const submit = async (event) => {
    event.preventDefault()
    dispatch(userActions.authStarted())

    try {
      const response = await fetch(`/api/auth/${mode === 'login' ? 'login' : 'signup'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Authentication failed')
      dispatch(userActions.authSucceeded(payload))
    } catch (submitError) {
      dispatch(userActions.authFailed(submitError.message))
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <KanbanSquare size={24} />
          <div>
            <strong>FlowBoard</strong>
            <span>Collaborative Redux Kanban</span>
          </div>
        </div>
        <div>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1>
          <p>Sign in to sync boards with MongoDB Atlas, Groq AI, realtime presence, and offline queue support.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button className="toolbar-button primary" disabled={status === 'loading'}>
            {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {status === 'loading' ? 'Working...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
        <button className="auth-switch" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <Sparkles size={15} />
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </button>
      </section>
    </main>
  )
}
