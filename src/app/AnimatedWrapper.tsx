"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ReactNode } from "react"

export default function AnimatedWrapper({
  children,
  pathname,
}: {
  children: ReactNode
  pathname: string
}) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div key={pathname}>{children}</div>
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  )
}
