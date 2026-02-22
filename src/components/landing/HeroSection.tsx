import Link from 'next/link'
import { Play } from 'lucide-react'
import DemoMockup from './DemoMockup'

export default function HeroSection() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 text-center relative grid-bg">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-full text-[13px] font-medium text-[#16a34a] mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
        Now in beta
      </div>
      <h1 className="font-bold tracking-tight leading-[1.1] mb-5 max-w-[700px]" style={{ fontSize: 'clamp(36px, 6vw, 56px)' }}>
        Think Together. Build Faster.
      </h1>
      <p className="text-lg text-slate-500 max-w-[520px] mb-8">
        A simple, elegant whiteboard for team collaboration. Drop ideas, sketch plans, and brainstorm in real-time with your team.
      </p>
      <div className="flex gap-3 mb-12">
        <Link href="/demo" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors">
          <Play size={14} />
          Try Demo
        </Link>
        <Link href="/signup" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors">
          Get Started
        </Link>
      </div>
      <DemoMockup />
    </section>
  )
}
