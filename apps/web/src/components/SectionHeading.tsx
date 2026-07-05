import type { ReactNode } from 'react'

export function SectionHeading({ eyebrow, title, body, align = 'center', action }: { eyebrow?: string; title: string; body?: string; align?: 'left' | 'center'; action?: ReactNode }) {
  return (
    <div className={`section-heading section-heading--${align}`}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
      </div>
      {action ? <div className="section-heading__action">{action}</div> : null}
    </div>
  )
}
