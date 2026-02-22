"use client"

import { Button } from "@/components/ui/button"

type EmptyStateProps = {
  onNewBoard: () => void
}

export function EmptyState({ onNewBoard }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 p-8">
        <svg
          className="mx-auto h-16 w-16 text-muted-foreground/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
          />
        </svg>
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">No boards yet</h2>
        <p className="text-muted-foreground">
          Create your first board to get started
        </p>
      </div>
      <Button onClick={onNewBoard}>Create board</Button>
    </div>
  )
}
