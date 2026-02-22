import Link from 'next/link'
import { Play } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-24 px-6 bg-[#f8fafc] text-center">
      <div className="max-w-[500px] mx-auto">
        <h2 className="text-[28px] font-bold tracking-tight mb-3">Ready to think together?</h2>
        <p className="text-[15px] text-slate-500 mb-8">
          Create your free account and start collaborating with your team in minutes.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors">
            Get Started Free
          </Link>
          <Link href="/demo" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
            <Play size={14} />
            Try Demo
          </Link>
        </div>
      </div>
    </section>
  )
}
