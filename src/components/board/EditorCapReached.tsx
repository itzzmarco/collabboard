'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface EditorCapReachedProps {
  ownerPlan: string
  boardId: string
  isOwner: boolean
  token?: string
}

export default function EditorCapReached({ ownerPlan, boardId, isOwner, token }: EditorCapReachedProps) {
  const router = useRouter()

  const limitText =
    ownerPlan === 'free'
      ? '2 editors on the Free plan'
      : ownerPlan === 'pro'
        ? '10 editors on the Pro plan'
        : ''

  const viewOnlyHref = token
    ? `/board/${boardId}?token=${token}&viewOnly=1`
    : `/board/${boardId}?viewOnly=1`

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="mx-auto max-w-md rounded-xl border bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <span className="text-2xl">&#9888;</span>
        </div>
        <h1 className="text-lg font-semibold text-slate-900">
          Editor limit reached
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          This board has reached its concurrent editor limit
          {limitText ? ` (${limitText})` : ''}.
          {isOwner
            ? ' Upgrade your plan to allow more editors.'
            : ' Please try again later or ask the board owner to upgrade.'}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/pricing"
            className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 transition"
          >
            {isOwner ? 'Upgrade plan' : 'View plans'}
          </Link>
          <Link
            href={viewOnlyHref}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Open in view-only mode
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-slate-500 hover:text-slate-700 transition"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
