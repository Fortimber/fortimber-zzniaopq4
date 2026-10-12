import React, { useState, useRef, useEffect } from 'react'
import { Bell, CheckCircle2, ChevronRight, ExternalLink } from 'lucide-react'
import { SAMPLE_NOTIFICATION } from '@/data/dashboard'

export const NotificationsPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-[#617169] hover:text-[#1A2E28] hover:bg-[#F6F7F4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#34785A]/30"
        aria-label="Abrir notificações"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {/* Amber dot indicator */}
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D97706] ring-2 ring-white" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-[#E5E9E4] shadow-lg py-2 z-50 animate-fade-in"
        >
          <div className="px-4 py-2 border-b border-[#E5E9E4] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#1A2E28]">Notificações</span>
              <span className="text-[10px] bg-[#D97706]/10 text-[#D97706] font-semibold px-1.5 py-0.5 rounded-full">
                1 nova
              </span>
            </div>
            <span className="text-xs text-[#617169]">Operacional</span>
          </div>

          <div className="p-3">
            <div className="p-3 rounded-lg bg-[#F6F7F4]/60 border border-[#E5E9E4]/80 hover:bg-[#F6F7F4] transition-colors">
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#D97706] shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1A2E28]">
                      {SAMPLE_NOTIFICATION.title}
                    </span>
                    <span className="text-[10px] text-[#617169]">
                      {SAMPLE_NOTIFICATION.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-[#617169] mt-1 leading-relaxed">
                    {SAMPLE_NOTIFICATION.message}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 border-t border-[#E5E9E4] flex items-center justify-between bg-[#F6F7F4]/30">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-[#34785A] hover:text-[#2B6349] transition-colors inline-flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-[#617169] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#34785A]" />
              Sincronizado
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
export default NotificationsPopover
