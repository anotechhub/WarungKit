import { PropsWithChildren, useEffect, useRef, useState } from 'react';

type ScrollRevealProps = PropsWithChildren<{
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  delayMs?: number;
}>;

export function ScrollReveal({
  as: Component = 'div',
  className = '',
  delayMs = 0,
  children,
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={ref as never}
      className={`wk-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--wk-delay': `${delayMs}ms` } as React.CSSProperties}
    >
      {children}
    </Component>
  );
}
