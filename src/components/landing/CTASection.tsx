'use client'

import Link from 'next/link'
import { Play } from 'lucide-react'
import { motion } from 'framer-motion'

const MotionLink = motion(Link)

export default function CTASection() {
  return (
    <section id="cta" className="py-24 px-6 bg-[#f8fafc] text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-[500px] mx-auto"
      >
        <h2 className="text-[28px] font-bold tracking-tight mb-3">Ready to think together?</h2>
        <p className="text-[15px] text-slate-500 mb-8">
          Create your free account and start collaborating with your team in minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <MotionLink 
            href="/signup" 
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors w-full sm:w-auto justify-center"
          >
            Get Started Free
          </MotionLink>
          <MotionLink 
            href="/demo" 
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors w-full sm:w-auto justify-center"
          >
            <Play size={14} />
            Try Demo
          </MotionLink>
        </div>
      </motion.div>
    </section>
  )
}
