import { type ReactNode } from 'react'

interface ShinyTextProps {
  children?: ReactNode
  text?: string
  disabled?: boolean
  speed?: number
  className?: string
}

export function ShinyText({
  children,
  text,
  disabled = false,
  speed = 3,
  className = '',
}: ShinyTextProps) {
  const content = text ?? children

  return (
    <span
      className={`shiny-text-root ${disabled ? 'is-disabled' : 'is-shining'} ${className}`}
      style={{
        animationDuration: `${speed}s`,
      }}
    >
      {content}
    </span>
  )
}
