'use client'

export default function DemoMockup() {
  return (
    <div className="w-full max-w-[1000px] mx-auto mt-12">
      <div className="bg-[#f8fafc] rounded-xl border border-slate-200 overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.04)]">
        {/* Browser chrome header */}
        <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          </div>
          <span className="text-[13px] font-medium text-slate-500">Product Roadmap Q1</span>
        </div>
        {/* Canvas */}
        <div className="h-[280px] sm:h-[400px] relative overflow-hidden grid-bg">
          {/* Sticky notes */}
          <div className="absolute left-[60px] top-[50px] landing-demo-note w-[160px] p-3.5 rounded-lg text-xs font-medium leading-relaxed shadow-sm bg-[#fef3c7] border border-[#fcd34d] text-[#92400e]">
            User Research<br /><br />Interview customers<br />Analyze feedback
          </div>
          <div className="absolute left-[260px] top-[70px] landing-demo-note w-[160px] p-3.5 rounded-lg text-xs font-medium leading-relaxed shadow-sm bg-[#dbeafe] border border-[#93c5fd] text-[#1e40af]">
            Design Sprint<br /><br />Wireframes<br />Prototype v1
          </div>
          <div className="hidden sm:block absolute left-[460px] top-[50px] landing-demo-note w-[160px] p-3.5 rounded-lg text-xs font-medium leading-relaxed shadow-sm bg-[#dcfce7] border border-[#86efac] text-[#166534]">
            Development<br /><br />MVP features<br />API integration
          </div>
          <div className="hidden sm:block absolute left-[660px] top-[70px] landing-demo-note w-[160px] p-3.5 rounded-lg text-xs font-medium leading-relaxed shadow-sm bg-[#fce7f3] border border-[#f9a8d4] text-[#9d174d]">
            Launch<br /><br />Beta release<br />Gather feedback
          </div>
          <div className="absolute left-[160px] top-[220px] landing-demo-note w-[160px] p-3.5 rounded-lg text-xs font-medium leading-relaxed shadow-sm bg-[#ede9fe] border border-[#c4b5fd] text-[#5b21b6]">
            Priority: HIGH<br /><br />Core features only
          </div>
          {/* Animated drawing */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path className="landing-draw-path" d="M 250 180 Q 350 140 450 180" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          {/* Animated cursors */}
          <div className="absolute pointer-events-none z-10 landing-cursor-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z" fill="#8b5cf6" stroke="white" strokeWidth="1.5"/>
            </svg>
            <span className="absolute left-3.5 top-3.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap" style={{ background: '#8b5cf6' }}>Sarah</span>
          </div>
          <div className="absolute pointer-events-none z-10 landing-cursor-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z" fill="#06b6d4" stroke="white" strokeWidth="1.5"/>
            </svg>
            <span className="absolute left-3.5 top-3.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap" style={{ background: '#06b6d4' }}>Alex</span>
          </div>
          <div className="absolute pointer-events-none z-10 landing-cursor-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z" fill="#f59e0b" stroke="white" strokeWidth="1.5"/>
            </svg>
            <span className="absolute left-3.5 top-3.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap" style={{ background: '#f59e0b' }}>Jordan</span>
          </div>
        </div>
      </div>
    </div>
  )
}
