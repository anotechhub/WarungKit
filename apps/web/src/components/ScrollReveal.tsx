import { useCallback, useEffect, useRef, useState, type CSSProperties, type PropsWithChildren } from 'react'

interface ScrollRevealProps extends PropsWithChildren {
  as?: 'div' | 'article'
  className?: string
  delayMs?: number
}

// Subtle, Apple-like reveal-on-scroll: fades/slides/blurs a section into
// place the first time it enters the viewport. Fully inert (renders
// immediately visible, no observer) when the user prefers reduced motion.
// Uses a callback ref (not useRef + effect) so the observer attaches as
// soon as the DOM node exists, regardless of which element type is used.
function useRevealOnScroll<T extends Element>(): [(node: T | null) => void, boolean] {
  const [visible, setVisible] = useState(false)
  const nodeRef = useRef<T | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const setNode = useCallback((node: T | null) => {
    observerRef.current?.disconnect()
    nodeRef.current = node
    if (!node) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    observerRef.current = observer
  }, [])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return [setNode, visible]
}

export function ScrollReveal({ as = 'div', className = '', delayMs = 0, children }: ScrollRevealProps) {
  const [ref, visible] = useRevealOnScroll<HTMLElement>()
  const style = { '--wk-delay': `${delayMs}ms` } as CSSProperties
  const combinedClassName = `wk-reveal ${visible ? 'is-visible' : ''} ${className}`.trim()

  if (as === 'article') {
    return (
      <article ref={ref} className={combinedClassName} style={style}>
        {children}
      </article>
    )
  }

  return (
    <div ref={ref} className={combinedClassName} style={style}>
      {children}
    </div>
  )
}
