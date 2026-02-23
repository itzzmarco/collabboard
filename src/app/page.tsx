import type { Metadata } from 'next'
import NavBar from '@/components/landing/NavBar'
import HeroSection from '@/components/landing/HeroSection'
import ProblemsSection from '@/components/landing/ProblemsSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'
import MotionProvider from '@/components/providers/MotionProvider'

export const metadata: Metadata = {
  title: 'Collab Board',
  description: 'Collaborative whiteboard for agile teams.',
  openGraph: {
    title: 'Collab Board',
    description: 'Collaborative whiteboard for agile teams.',
    url: '/',
    siteName: 'Collab Board',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Collab Board',
    description: 'Collaborative whiteboard for agile teams.',
  },
}

export default function HomePage() {
  return (
    <MotionProvider>
      <main id="main-content" aria-label="Collab Board landing page">
        <NavBar />
        <HeroSection />
        <ProblemsSection />
        <FeaturesSection />
        <CTASection />
        <Footer />
      </main>
    </MotionProvider>
  )
}
