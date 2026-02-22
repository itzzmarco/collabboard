import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'

export default function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6">
      <Link href="/" className="flex items-center gap-2.5 font-semibold text-[15px] text-slate-800 no-underline">
        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
          <LayoutGrid size={16} className="text-slate-500" />
        </div>
        Collab Board
      </Link>
      <div className="flex items-center gap-3">
        <Link href="/demo" className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
          Try Demo
        </Link>
        <Link href="/signup" className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors">
          Get Started
        </Link>
      </div>
    </nav>
  )
}
