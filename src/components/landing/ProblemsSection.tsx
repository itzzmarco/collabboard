import { Video, MessageSquare, Settings } from 'lucide-react'

const problems = [
  { icon: Video, title: "Video calls aren't visual", description: "Talking through ideas without a shared canvas leads to misunderstandings and lost context." },
  { icon: MessageSquare, title: "Ideas get lost", description: "Brilliant thoughts vanish in chat threads and meeting notes. Nothing sticks." },
  { icon: Settings, title: "Tools are overcomplicated", description: "Most whiteboards have 100 features when you need 5. Simplicity wins." },
]

export default function ProblemsSection() {
  return (
    <section className="py-24 px-6 bg-[#fafafa]">
      <div className="text-center mb-16">
        <div className="text-[13px] font-semibold text-[#3b82f6] uppercase tracking-[0.05em] mb-3">The Problem</div>
        <h2 className="text-[32px] font-bold tracking-tight">Collaboration is broken</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[900px] mx-auto">
        {problems.map(({ icon: Icon, title, description }) => (
          <div key={title} className="bg-white border border-slate-200 rounded-xl p-7">
            <div className="w-10 h-10 rounded-[10px] bg-[#fef2f2] flex items-center justify-center text-red-500 mb-4">
              <Icon size={20} />
            </div>
            <h3 className="text-base font-semibold mb-2">{title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
