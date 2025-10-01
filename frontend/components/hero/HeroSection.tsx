"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Ballpit from '../Ballpit'

/** Types a sentence with a highlighted middle segment (keeps styling intact). */
function TypewriterParagraph({
  lead,
  highlight,
  tail,
  className = "",
  speed = 24,       // ms per character (lower = faster)
  startDelay = 400, // ms before typing starts
  showCaret = true
}: {
  lead: string
  highlight: string
  tail: string
  className?: string
  speed?: number
  startDelay?: number
  showCaret?: boolean
}) {
  const [count, setCount] = useState(0)
  const total = lead.length + highlight.length + tail.length

  useEffect(() => {
    const delay = setTimeout(() => {
      const id = setInterval(() => {
        setCount((c) => {
          if (c >= total) {
            clearInterval(id)
            return c
          }
          return c + 1
        })
      }, speed)
      return () => clearInterval(id)
    }, startDelay)
    return () => clearTimeout(delay)
  }, [speed, startDelay, total])

  // Compute visible segments
  const leadEnd = Math.min(count, lead.length)
  const midEnd = Math.min(Math.max(0, count - lead.length), highlight.length)
  const tailEnd = Math.min(Math.max(0, count - lead.length - highlight.length), tail.length)

  const leadText = lead.slice(0, leadEnd)
  const highlightText = highlight.slice(0, midEnd)
  const tailText = tail.slice(0, tailEnd)

  const done = count >= total

  return (
    <p className={className} aria-live="polite">
      {leadText}
      <span className="font-medium">{highlightText}</span>
      {tailText}
      {showCaret && (
        <span className={`inline-block w-[0.6ch] ${done ? "opacity-0" : "opacity-80"} animate-pulse`}>
          |
        </span>
      )}
    </p>
  )
}

interface HeroSectionProps {
  onScrollToForm: () => void
}

export default function HeroSection({ onScrollToForm }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F5F4F9] via-[#E8E3F0] to-[#DDD4E8]">
      {/* 3D Background Scene — now full-bleed */}
      <div className="absolute inset-0 z-0">
        {/* <MolecularScene /> */}
        <Ballpit
          count={120}
          gravity={0.2}
          friction={0.8}
          wallBounce={0.95}
          followCursor={true}
          colors={['#8B7DFF', '#A594FF', '#D3CFFF', '#c5c4c9ff']}
          ambientColor={16777215}
          ambientIntensity={0.2}
          lightIntensity={100}
        />
      </div>

      {/* Vignette + right-side emphasis fade (keeps text legible on top) */}
      <div className="pointer-events-none absolute inset-0 z-[1]">
        {/* soft global vignette */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/10" />
        {/* right-to-left fade so left glass card pops more */}
        <div className="absolute inset-0 lg:bg-gradient-to-l lg:from-white/30 lg:via-white/10 lg:to-transparent" />
      </div>

      {/* Hero Content (glassmorphic left panel stacked on top of scene) */}
      <div className="relative z-10 container mx-auto ml-[10vw] px-6 pt-28 md:pt-36 pb-16">
        <div className="min-h-[calc(100vh-10rem)] flex items-start md:items-center">
          {/* Glassmorphic Card */}
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="
              max-w-xl
              bg-white/15 backdrop-blur-2xl
              border border-white/30
              rounded-xl p-6 md:p-8
              shadow-[0_10px_30px_rgba(16,14,40,0.12)]
              relative overflow-hidden
            "
          >
            {/* subtle inner highlight for “glass” sheen */}
            <div className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,white,transparent)]">
              <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
            </div>

            {/* Small logo/branding */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-6 flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#8B7DFF] to-[#A594FF] rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full opacity-80" />
              </div>
              {/* <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#8B7DFF] rounded-full opacity-60" />
                <div className="w-2 h-2 bg-[#A594FF] rounded-full opacity-80" />
                <div className="w-2 h-2 bg-[#8B7DFF] rounded-full opacity-40" />
              </div> */}
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-2xl md:text-3xl xl:text-4xl font-light leading-[1.1] text-[#1A1A1A] mb-6 tracking-[0.015em] max-w-[20ch]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Our mission is to make
              <br />
              <span className="font-normal text-[#8B7DFF]">advanced genomics</span>
              <br />
              accessible everywhere.
            </motion.h1>

            {/* Subheadline */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mb-10 max-w-lg"
            >
              <TypewriterParagraph
                className="text-base md:text-lg text-[#1A1A1A]/80 leading-relaxed"
                lead="At SimBioSys, we believe advanced genomics shouldn't be confined to labs. "
                highlight="Democratizing scientific discovery"
                tail=" through accessible computational tools."
                speed={22}        // tweak typing speed (ms/char)
                startDelay={550}  // aligns with your motion.div delay
              />
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex items-center gap-4 flex-wrap"
            >
              <motion.button
                onClick={onScrollToForm}
                className="bg-[#8B7DFF] hover:bg-[#7B6DFF] text-white px-8 py-4 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.12 }}
              >
                Start Analysis
              </motion.button>

              <motion.a
                href="#learn-more"
                className="text-[#8B7DFF] hover:text-[#7B6DFF] font-medium px-4 py-4 transition-colors duration-200 hover:underline underline-offset-4"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.12 }}
              >
                Learn more
              </motion.a>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.button
        onClick={onScrollToForm}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
      >
        <div className="w-6 h-10 border-2 border-[#1A1A1A]/30 rounded-full flex justify-center">
          <div className="w-0.5 h-2 bg-[#1A1A1A]/50 rounded-full mt-2" />
        </div>
      </motion.button>
    </section>
  )
}
