import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#F6F7F4] flex font-sans antialiased text-[#1A2E28]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPath={location.pathname}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Container (offset by sidebar width on desktop) */}
      <div className="flex-1 min-w-0 lg:pl-64 flex flex-col min-h-screen">
        {/* Sticky Top Header */}
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} currentPageTitle="Visão Geral" />

        {/* Page Content Landmark */}
        <main className="flex-1 min-w-0 p-6 lg:p-10">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <Outlet />
          </div>
        </main>

        {/* Minimalist Corporate Footer */}
        <footer className="border-t border-[#E5E9E4] bg-white py-4 px-6 lg:px-10 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#617169]">
            <span>Fortimber — Inteligência Operacional Florestal</span>
            <div className="flex items-center gap-4">
              <span>Ambiente B2B Seguro</span>
              <span className="font-mono text-[11px] text-[#617169]/80 bg-[#F6F7F4] px-2 py-0.5 rounded border border-[#E5E9E4]">
                v0.1.0
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
export default AppLayout
