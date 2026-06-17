import { forwardRef } from 'react'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  noPadding?: boolean
  small?: boolean
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className = '', noPadding, small, onClick, ...rest }, ref) => {
    const base = 'glass rounded-3xl transition-all duration-200'
    const padding = noPadding ? '' : small ? 'p-4' : 'p-5'
    const interactive = onClick ? 'cursor-pointer active:scale-[0.98]' : ''

    return (
      <div
        ref={ref}
        className={`${base} ${padding} ${interactive} ${className}`}
        onClick={onClick}
        {...rest}
      >
        {children}
      </div>
    )
  }
)

GlassCard.displayName = 'GlassCard'
