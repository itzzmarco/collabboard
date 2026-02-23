'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <nav role="navigation" aria-label="Main navigation" className="fixed top-0 left-0 right-0 z-[100] h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-[15px] text-slate-800 no-underline">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
            <LayoutGrid size={16} className="text-slate-500" />
          </div>
          Collab Board
        </Link>
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/demo" className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            Try Demo
          </Link>
          <Link href="/signup" className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors">
            Get Started
          </Link>
        </div>
        <button
          type="button"
          className="sm:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="sm:hidden fixed top-16 left-0 right-0 z-[99] bg-white border-b border-slate-200 shadow-sm"
          >
            <div className="flex flex-col px-6 py-3 gap-1">
              <Link
                href="/demo"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                Try Demo
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors text-center"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
