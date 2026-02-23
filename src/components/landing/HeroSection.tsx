'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import DemoMockup from './DemoMockup'

const MotionLink = motion(Link)

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.section id="hero" className="min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 text-center relative grid-bg hero-gradient">
      {/* Badge */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: 'easeOut', delay: 0 }}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-full text-[13px] font-medium text-[#16a34a] mb-6"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
        Now in beta
      </motion.div>
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: 'easeOut', delay: shouldReduceMotion ? 0 : 0.1 }}
        className="font-bold tracking-tight leading-[1.1] mb-5 max-w-[700px]" 
        style={{ fontSize: 'clamp(40px, 6.5vw, 60px)' }}
      >
        Think Together. Build Faster.
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: 'easeOut', delay: shouldReduceMotion ? 0 : 0.2 }}
        className="text-lg text-slate-500 max-w-[520px] mb-8"
      >
        A simple, elegant whiteboard for team collaboration. Drop ideas, sketch plans, and brainstorm in real-time with your team.
      </motion.p>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: 'easeOut', delay: shouldReduceMotion ? 0 : 0.3 }}
        className="flex flex-col sm:flex-row items-center gap-3 mb-12"
      >
        <MotionLink 
          href="/demo" 
          whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors w-full sm:w-auto justify-center"
        >
          <Play size={14} />
          Try Demo
        </MotionLink>
        <MotionLink 
          href="/signup" 
          whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors w-full sm:w-auto justify-center"
        >
          Get Started
        </MotionLink>
      </motion.div>
      <motion.div 
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.7, delay: shouldReduceMotion ? 0 : 0.4 }}
        className="w-full overflow-hidden"
      >
        <DemoMockup />
      </motion.div>
    </motion.section>
  )
}
