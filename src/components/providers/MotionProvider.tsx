"use client"

import { AnimatePresence, useReducedMotion } from "framer-motion"
import { ReactNode } from "react"

export default function MotionProvider({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <>{children}</>
  }

  return (
    <AnimatePresence mode="wait">
      {children}
    </AnimatePresence>
  )
}
