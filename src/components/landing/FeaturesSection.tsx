'use client'

import { Users, StickyNote, Pencil, Link as LinkIcon } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  { icon: Users, title: "Real-time Canvas", description: "See your team's changes instantly. No refresh needed." },
  { icon: StickyNote, title: "Sticky Notes", description: "Organize thoughts with colorful notes. Drag to arrange." },
  { icon: Pencil, title: "Drawing Tools", description: "Sketch, annotate, and connect ideas with simple strokes." },
  { icon: LinkIcon, title: "Share with a Link", description: "One link to invite your whole team. No sign-up required." },
]

export default function FeaturesSection() {
  return (
    <motion.section id="features" aria-labelledby="features-heading" className="py-24 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <div className="text-[13px] font-semibold text-[#3b82f6] uppercase tracking-[0.05em] mb-3">Features</div>
        <h2 id="features-heading" className="text-[32px] font-bold tracking-tight">Everything you need, nothing you don&apos;t</h2>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-[1000px] mx-auto">
        {features.map(({ icon: Icon, title, description }, index) => (
          <motion.div 
            key={title} 
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, delay: index * 0.08 }}
            whileHover={{ y: -6, boxShadow: '0 12px 32px rgba(0,0,0,0.09)' }}
            className="text-center p-6 border border-slate-200 rounded-xl shadow-sm bg-white"
          >
            <div className="w-14 h-14 rounded-[14px] bg-slate-100 flex items-center justify-center text-slate-800 mx-auto mb-5">
              <Icon size={24} />
            </div>
            <h3 className="text-base font-semibold mb-2">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
