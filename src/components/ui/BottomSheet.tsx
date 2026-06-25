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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: '24px' }}>
      {/* Blurred overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 animate-[fadeIn_0.18s_ease-out]"
        style={{
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md modal-glass rounded-[24px] flex flex-col animate-[scaleIn_0.22s_cubic-bezier(0.34,1.2,0.64,1)] ${tall ? 'max-h-[88vh]' : 'max-h-[80vh]'}`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0 border-b border-[rgba(255,255,255,0.07)]">
            <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 page-scroll px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
