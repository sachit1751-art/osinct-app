import { useEffect, useState, useRef, useCallback } from 'react'

interface DecryptedTextProps {
  text: string
  speed?: number
  maxIterations?: number
  characters?: string
  className?: string
  parentClassName?: string
  encryptedClassName?: string
  animateOn?: 'mount' | 'hover'
}

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=~'

export function DecryptedText({
  text,
  speed = 30,
  maxIterations = 10,
  characters = DEFAULT_CHARS,
  className = '',
  parentClassName = '',
  encryptedClassName = 'text-blue-400 opacity-80',
  animateOn = 'mount',
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState<string>(text)
  const [isDecrypted, setIsDecrypted] = useState(animateOn !== 'mount')
  const hoverIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (animateOn !== 'mount') return

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    let currentIteration = 0
    const textLength = text.length
    const charsLength = characters.length

    const interval = window.setInterval(() => {
      setDisplayText(() => {
        const result: string[] = []
        for (let i = 0; i < textLength; i++) {
          if (text[i] === ' ') {
            result.push(' ')
            continue
          }
          const lockIndex = Math.floor(currentIteration / 2)
          if (i < lockIndex) {
            result.push(text[i])
          } else {
            const randomIndex = Math.floor(Math.random() * charsLength)
            result.push(characters[randomIndex])
          }
        }
        return result.join('')
      })

      currentIteration += 1
      if (currentIteration >= textLength * 2 + maxIterations) {
        clearInterval(interval)
        setDisplayText(text)
        setIsDecrypted(true)
      }
    }, speed)

    return () => {
      clearInterval(interval)
    }
  }, [animateOn, text, speed, maxIterations, characters])

  const runHoverScramble = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    if (hoverIntervalRef.current !== null) {
      clearInterval(hoverIntervalRef.current)
    }

    let currentIteration = 0
    const textLength = text.length
    const charsLength = characters.length
    setIsDecrypted(false)

    hoverIntervalRef.current = window.setInterval(() => {
      setDisplayText(() => {
        const result: string[] = []
        for (let i = 0; i < textLength; i++) {
          if (text[i] === ' ') {
            result.push(' ')
            continue
          }
          const lockIndex = Math.floor(currentIteration / 2)
          if (i < lockIndex) {
            result.push(text[i])
          } else {
            const randomIndex = Math.floor(Math.random() * charsLength)
            result.push(characters[randomIndex])
          }
        }
        return result.join('')
      })

      currentIteration += 1
      if (currentIteration >= textLength * 2 + maxIterations) {
        if (hoverIntervalRef.current !== null) {
          clearInterval(hoverIntervalRef.current)
          hoverIntervalRef.current = null
        }
        setDisplayText(text)
        setIsDecrypted(true)
      }
    }, speed)
  }, [text, speed, maxIterations, characters])

  const handleMouseEnter = () => {
    if (animateOn === 'hover') {
      runHoverScramble()
    }
  }

  return (
    <span
      className={`inline-block ${parentClassName}`}
      onMouseEnter={handleMouseEnter}
      aria-label={text}
    >
      <span className={isDecrypted ? className : `${className} ${encryptedClassName}`}>
        {displayText}
      </span>
    </span>
  )
}
