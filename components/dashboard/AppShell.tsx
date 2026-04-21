'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  PenLine,
  History,
  BarChart3,
  BarChart2,
  Trophy,
  Footprints,
  Target,
  Settings,
  LogOut,
  Plus,
  ChevronLeft,
  Menu,
  LayoutGrid,
  Clock,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/log', label: 'Log Run', icon: PenLine },
  { href: '/history', label: 'History', icon: History },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/races', label: 'Races', icon: Trophy },
  { href: '/shoes', label: 'Shoes', icon: Footprints },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const mobileNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
]

const moreSheetItems = [
  { href: '/shoes', label: 'Shoes', icon: Footprints },
  { href: '/races', label: 'Races', icon: Trophy },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface AppShellProps {
  userEmail: string
  isDemoUser?: boolean
  children: React.ReactNode
}

export function AppShell({ userEmail, isDemoUser = false, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D1117]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden flex-col border-r border-white/10 bg-[#0D1117] transition-all duration-200 md:flex ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-4">
          {!collapsed && (
            <Link href="/dashboard" prefetch={true} className="flex items-center gap-2">
              <img src="/logo.svg" alt="" className="size-7 shrink-0" />
              <span className="text-xl font-bold text-[#C41230]">BatchBurn</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1 text-white/40 hover:bg-white/5 hover:text-white/70"
          >
            <ChevronLeft
              className={`size-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'border-l-2 border-[#C41230] bg-[#C41230]/10 text-[#C41230]'
                    : 'border-l-2 border-transparent text-white/50 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <p className="mb-2 truncate text-xs text-white/40">{userEmail}</p>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-white/80"
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {isDemoUser && (
          <div className="border-b border-amber-700/50 bg-amber-900/40 py-2 text-center text-sm text-amber-200">
            You are in demo mode — data resets nightly.{' '}
            <a
              href="https://www.batch-apps.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-100"
            >
              Request access at batch-apps.com
            </a>{' '}
            to get your own account.
          </div>
        )}
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 h-20 border-t border-white/10 bg-[#0D1117]/95 pt-3 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <nav className="flex items-center justify-around px-2">
          {/* Dashboard + History (left of FAB) */}
          {mobileNavItems.slice(0, 2).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
                  isActive ? 'text-[#C41230]' : 'text-white/40'
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            )
          })}

          {/* FAB */}
          <Link
            href="/log"
            prefetch={true}
            className="flex size-12 -translate-y-3 items-center justify-center rounded-full bg-[#C41230] shadow-lg shadow-[#C41230]/25"
          >
            <Plus className="size-6 text-[#0D1117]" />
          </Link>

          {/* Analytics (right of FAB) */}
          {mobileNavItems.slice(2).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
                  isActive ? 'text-[#C41230]' : 'text-white/40'
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] text-white/40"
          >
            <Menu className="size-5" />
            More
          </button>
        </nav>
      </div>

      {/* More Bottom Sheet */}
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 md:hidden ${
          moreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMoreOpen(false)}
      />
      {/* Panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-[#161B22] rounded-t-2xl transition-transform duration-300 md:hidden ${
          moreOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-4" />
        {/* 2x2 grid */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-8">
          {moreSheetItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-white/70 active:bg-white/10"
              >
                <Icon className="size-6" />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
