import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement>

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export function SearchIcon(props: Props) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><circle cx="11" cy="11" r="7" {...base} /><path d="m20 20-4-4" {...base} /></svg>
}

export function ChevronIcon({ direction = 'right', ...props }: Props & { direction?: 'left' | 'right' }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d={direction === 'right' ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} {...base} /></svg>
}

export function PackageIcon(props: Props) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="m4 7 8-4 8 4-8 4-8-4Z" {...base} /><path d="M4 7v10l8 4 8-4V7M12 11v10" {...base} /></svg>
}

export function RefreshIcon(props: Props) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M20 7v5h-5M4 17v-5h5" {...base} /><path d="M18.2 9A7 7 0 0 0 6 6.7L4 12m16 0-2 5.3A7 7 0 0 1 5.8 15" {...base} /></svg>
}

export function CloseIcon(props: Props) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="m6 6 12 12M18 6 6 18" {...base} /></svg>
}

export function StoreIcon(props: Props) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M4 10v10h16V10M3 10l2-6h14l2 6" {...base} /><path d="M3 10a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2M9 20v-5h6v5" {...base} /></svg>
}
