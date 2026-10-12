import React from 'react'
import { Search, ChevronRight, Menu } from 'lucide-react'
import { USER_PROFILE } from '@/data/dashboard'
import { NotificationsPopover } from './NotificationsPopover'

interface HeaderProps {
  onOpenMobileMenu: () => void
  currentPageTitle?: string
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  currentPageTitle = 'Visão Geral',
}) => {
  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E5E9E4] flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
      {/* Left: Mobile menu toggle + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-[#1A2E28] hover:bg-[#F6F7F4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#34785A]/30"
          aria-label="Abrir menu lateral"
        >
          <Menu className="w-5 h-5 text-[#1A2E28]" />
        </button>

        {/* Breadcrumb */}
        <nav aria-label="Navegação estrutural" className="flex items-center gap-1.5 text-sm">
          <span className="text-[#617169] font-normal hover:text-[#1A2E28] transition-colors">
            Fortimber
          </span>
          <ChevronRight className="w-4 h-4 text-[#617169]/60 shrink-0" />
          <span className="text-[#1A2E28] font-semibold tracking-tight">{currentPageTitle}</span>
        </nav>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Global Search (Input on md+, Icon only on small screens) */}
        <div className="relative hidden md:block">
          <div className="flex items-center w-72 h-9 pl-3 pr-2 rounded-lg bg-[#F6F7F4] border border-[#E5E9E4] text-sm text-[#1A2E28] transition-all focus-within:bg-white focus-within:border-[#34785A]/50 focus-within:ring-2 focus-within:ring-[#34785A]/15">
            <Search className="w-4 h-4 text-[#617169] mr-2 shrink-0" />
            <input
              type="text"
              readOnly
              placeholder="Pesquisar (Ctrl+K)"
              className="bg-transparent text-sm w-full outline-none text-[#1A2E28] placeholder-[#617169] cursor-pointer"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-[#617169] bg-white rounded border border-[#E5E9E4] select-none shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Mobile Search Icon Button */}
        <button
          type="button"
          className="md:hidden p-2 rounded-lg text-[#617169] hover:text-[#1A2E28] hover:bg-[#F6F7F4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#34785A]/30"
          aria-label="Pesquisar"
          title="Pesquisar"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notification Dropdown */}
        <NotificationsPopover />

        {/* User Avatar badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#E5E9E4]">
          <div
            className="w-8 h-8 rounded-full bg-[#34785A] text-white flex items-center justify-center text-xs font-semibold tracking-wide shadow-2xs select-none"
            title={`${USER_PROFILE.name} (${USER_PROFILE.role})`}
            aria-label={`Perfil de ${USER_PROFILE.name}`}
          >
            {USER_PROFILE.initials}
          </div>
        </div>
      </div>
    </header>
  )
}
export default Header
