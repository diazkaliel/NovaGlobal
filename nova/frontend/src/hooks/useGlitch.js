import { useState, useEffect } from 'react'

export function useGlitch(text, active = true) {
  const [displayed, setDisplayed] = useState(text)
  const chars = '!<>-_\\/[]{}—=+*^?#ABCDEF0123456789'

  useEffect(() => {
    if (!active) { setDisplayed(text); return }

    let iteration = 0
    const interval = setInterval(() => {
      setDisplayed(
        text.split('').map((char, i) => {
          if (i < iteration) return text[i]
          if (char === ' ') return ' '
          return chars[Math.floor(Math.random() * chars.length)]
        }).join('')
      )
      if (iteration >= text.length) clearInterval(interval)
      iteration += 0.5
    }, 40)

    return () => clearInterval(interval)
  }, [text, active])

  return displayed
}