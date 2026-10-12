import React from 'react'
import {
  LayoutDashboard,
  FileText,
  CalendarRange,
  Factory,
  Warehouse,
  Truck,
  Bell,
  Settings,
  ChevronRight,
  LogOut,
  Trees,
  X,
} from 'lucide-react'
import { NAVIGATION_ITEMS, USER_PROFILE, type NavItemConfig } from '@/data/dashboard'

interface SidebarProps {
  currentPath?: string
  mobileOpen?: boolean
  onCloseMobile?: () => void
}

const iconMap = {
  LayoutDashboard,
  FileText,
  CalendarRange,
  Factory,
  Warehouse,
  Truck,
  Bell,
  Settings,
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath = '/',
  mobileOpen = false,
  onCloseMobile,
}) => {
  const groups: Array<'PRINCIPAL' | 'OPERACIONAL' | 'SISTEMA'> = [
    'PRINCIPAL',
    'OPERACIONAL',
    'SISTEMA',
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full w-64 bg-[#111C18] text-white border-r border-[#162721] select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#1b2b24] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#34785A]/20 border border-[#34785A]/40 flex items-center justify-center text-[#34785A] shadow-inner">
            <Trees className="w-5 h-5 text-[#34785A]" strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-base text-white tracking-tight leading-none font-sans">
              Fortimber
            </span>
            <span className="text-[10px] text-white/40 tracking-wider font-mono mt-0.5 uppercase">
              Inteligência Florestal
            </span>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus:ring-1 focus:ring-[#34785A]"
            aria-label="Fechar menu de navegação"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => {
          const items = NAVIGATION_ITEMS.filter((item) => item.group === group)
          return (
            <div key={group} className="space-y-1.5">
              <div className="px-3 text-[11px] font-semibold tracking-wider text-white/35 uppercase">
                {group}
              </div>
              <ul className="space-y-0.5">
                {items.map((item: NavItemConfig) => {
                  const Icon = iconMap[item.icon]
                  const isActive = currentPath === item.path && !item.disabled

                  if (item.disabled) {
                    return (
                      <li key={item.id}>
                        <div
                          className="group relative flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-white/35 cursor-not-allowed select-none transition-colors hover:bg-white/[0.02]"
                          title="Módulo em breve"
                          role="link"
                          aria-disabled="true"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4 text-white/30 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] uppercase tracking-wider font-medium bg-white/10 text-white/70 px-1.5 py-0.5 rounded border border-white/5">
                              Em breve
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </li>
                    )
                  }

                  return (
                    <li key={item.id}>
                      <a
                        href={item.path}
                        className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-[#34785A]/15 text-white'
                            : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        {/* Active vertical accent bar */}
                        {isActive && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#34785A] rounded-r-full"
                            aria-hidden="true"
                          />
                        )}

                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive ? 'text-[#34785A]' : 'text-white/60 group-hover:text-white'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>

                        <ChevronRight
                          className={`w-3.5 h-3.5 transition-all duration-150 ${
                            isActive
                              ? 'text-[#34785A] opacity-100'
                              : 'text-white/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'
                          }`}
                        />
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* User Footer Block */}
      <div className="p-3 border-t border-[#1b2b24] shrink-0 bg-[#0E1714]">
        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#34785A] flex items-center justify-center text-xs font-semibold text-white tracking-wide shrink-0 shadow-sm border border-[#34785A]/60">
              {USER_PROFILE.initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-white truncate leading-tight">
                {USER_PROFILE.name}
              </span>
              <span className="text-[11px] text-white/50 truncate leading-tight mt-0.5">
                {USER_PROFILE.role}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="p-1.5 rounded text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors focus:outline-none focus:ring-1 focus:ring-[#34785A]"
            aria-label="Sair da plataforma"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 z-30 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Container */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-visibility duration-200 ${
          mobileOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
      >
        {/* Backdrop overlay */}
        <div
          onClick={onCloseMobile}
          className={`fixed inset-0 bg-black/60 transition-opacity duration-200 ease-in-out ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />

        {/* Drawer slide-in panel */}
        <aside
          className={`fixed inset-y-0 left-0 w-64 max-w-[80vw] transform transition-transform duration-300 ease-out shadow-2xl ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-label="Navegação móvel"
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  )
}
export default Sidebar
