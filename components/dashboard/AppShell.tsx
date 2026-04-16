'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  PenLine,
  History,
  BarChart3,
  Trophy,
  Footprints,
  Target,
  Settings,
  LogOut,
  Plus,
  ChevronLeft,
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
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/history', label: 'History', icon: History },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface AppShellProps {
  userEmail: string
  children: React.ReactNode
}

export function AppShell({ userEmail, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

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
            <Link href="/dashboard" className="text-xl font-bold text-[#C41230]">
              BatchBurn
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
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0D1117]/95 backdrop-blur md:hidden">
        <nav className="flex items-center justify-around px-2 py-2">
          {mobileNavItems.slice(0, 2).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
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
            className="flex size-12 -translate-y-3 items-center justify-center rounded-full bg-[#C41230] shadow-lg shadow-[#C41230]/25"
          >
            <Plus className="size-6 text-[#0D1117]" />
          </Link>

          {mobileNavItems.slice(2).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] ${
                  isActive ? 'text-[#C41230]' : 'text-white/40'
                }`}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
