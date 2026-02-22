'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NewBoardModal } from './NewBoardModal'
import { signOut } from '@/app/actions/auth'
import type { Profile } from '@/types'

export function DashboardHeader({
  profile,
  userEmail,
}: {
  profile: Profile | null
  userEmail: string | undefined
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const initials = (profile?.display_name?.trim()?.[0] ?? userEmail?.trim()?.[0] ?? '?').toUpperCase()

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-semibold text-[14px] text-slate-800"
      >
        <div className="w-[26px] h-[26px] bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center">
          <LayoutGrid size={14} className="text-slate-500" />
        </div>
        Collab Board
      </Link>
      <div className="flex items-center gap-3">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-800 text-white hover:bg-slate-900 h-9 px-4 text-[13px]"
        >
          + New Board
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-slate-300">
              <Avatar className="w-8 h-8">
                <AvatarFallback
                  style={{ backgroundColor: profile?.avatar_color ?? '#e2e8f0' }}
                  className="text-white text-xs font-semibold"
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-slate-500 font-normal truncate">
              {userEmail}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut()}>Sign out</DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                window.location.href =
                  'mailto:support@collabboard.app?subject=Account%20Deletion%20Request'
              }}
            >
              Delete account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <NewBoardModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </header>
  )
}
