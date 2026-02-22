import Link from 'next/link'
import { redirect } from 'next/navigation'

export default function DemoPage() {
  const boardId = process.env.DEMO_BOARD_ID
  const viewToken = process.env.DEMO_VIEW_TOKEN

  if (boardId && viewToken) {
    redirect(`/board/${boardId}?token=${viewToken}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-800 mb-3">Demo not configured</h1>
      <p className="text-slate-500 mb-6 max-w-sm">
        Set <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">DEMO_BOARD_ID</code> and{' '}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">DEMO_VIEW_TOKEN</code> in your environment to enable the demo.
      </p>
      <Link href="/signup" className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium bg-[#3b82f6] text-white hover:bg-[#2563eb] transition-colors">
        Get Started
      </Link>
    </main>
  )
}
