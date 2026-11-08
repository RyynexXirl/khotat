export function BrandMark({ className = 'size-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M24 3l6 8.5 10 2.5-2.5 10L40 34l-10 2.5L24 45l-6-8.5L8 34l2.5-10L8 14l10-2.5z" className="text-gold" stroke="var(--gold)" />
        <path d="M15 30c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0V18c-3-1.5-6-1.5-9 0-3-1.5-6-1.5-9 0z" />
        <path d="M24 18v12" />
      </g>
    </svg>
  )
}
