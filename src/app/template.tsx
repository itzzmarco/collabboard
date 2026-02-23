"use client"

import { usePathname } from "next/navigation"
import { ReactNode } from "react"
import dynamic from "next/dynamic"

// Feature flag to control if page transitions should be used on this environment/route
const ENABLE_PAGE_ANIMATIONS = process.env.NEXT_PUBLIC_ENABLE_PAGE_ANIMATIONS === 'true'

// Dynamically import framer-motion wrapper so it's only bundled when animations are enabled
const AnimatedWrapper = dynamic(() => import("./AnimatedWrapper"), {
  ssr: true,
})

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (!ENABLE_PAGE_ANIMATIONS) {
    return <div key={pathname}>{children}</div>
  }

  return <AnimatedWrapper pathname={pathname}>{children}</AnimatedWrapper>
}
