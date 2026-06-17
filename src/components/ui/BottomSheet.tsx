import { useEffect, useRef } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  tall?: boolean
}

export function BottomSheet({ isOpen, onClose, title, children, tall }: BottomSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 sheet-overlay animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`relative w-full max-w-lg glass rounded-t-[28px] animate-[slideUp_0.35s_cubic-bezier(0.32,0.72,0,1)] flex flex-col ${tall ? 'max-h-[90dvh]' : 'max-h-[80dvh]'}`}
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--text-muted)] opacity-30" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-3 flex-shrink-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 glass-sm rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 page-scroll px-6 pb-2">
          {children}
        </div>
      </div>
    </div>
  )
}
