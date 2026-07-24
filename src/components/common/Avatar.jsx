export function Avatar({ name, color, size = 26, className = '', title }) {
  const initial = name?.slice(0, 1).toUpperCase() ?? '?'

  return (
    <span
      className={`avatar ${className}`}
      style={{ '--avatar-color': color, width: size, height: size }}
      title={title ?? name}
      aria-label={name}
    >
      {initial}
    </span>
  )
}
