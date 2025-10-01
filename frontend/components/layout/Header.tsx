"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Menu, Grid3X3 } from "lucide-react"
import GlassSurface from '../GlassSurface'

interface HeaderProps {
  onScrollToForm: () => void
}

export default function Header({ onScrollToForm }: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll for enhanced backdrop
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Variants for staggered slide-up
  const containerVariants = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
  }
  const lineVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 0.7,
      y: 0,
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="flex justify-center pt-4 px-4">
        <GlassSurface
          displace={0.5}
          distortionScale={-180}
          redOffset={0}
          greenOffset={10}
          blueOffset={20}
          brightness={100}
          opacity={0.93}
          backgroundOpacity={0}
          saturation={1}
          blur={11}
          mixBlendMode="screen"
          width="80%"
          height="9vh"
          borderRadius={50}
          borderWidth={0.07}

          className="pointer-events-auto max-w-7xl"
        >
          <div className="px-6 py-4 w-full">
            <div className="flex items-center justify-between">
              {/* Logo - Exact typography */}
              <div className="flex items-center space-x-3">
                
                <h1 className="text-xl font-bold tracking-tight">SimBioSys</h1>

                {/* Tagline: always animate on refresh */}
                <motion.div
                  className="text-xs text-[#1A1A1A]/70 leading-tight will-change-transform"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <motion.div variants={lineVariants}>the</motion.div>
                  <motion.div variants={lineVariants}>genomics</motion.div>
                  <motion.div variants={lineVariants}>products</motion.div>
                </motion.div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                {/* Search with dropdown */}
                <div className="relative">
                  <button
                    className="flex items-center space-x-2 text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors text-sm"
                    onClick={() => setShowSearch(!showSearch)}
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>

                  {showSearch && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-full left-0 mt-2 pointer-events-auto"
                    >
                      <GlassSurface
                        displace={5}
                        distortionScale={-80}
                        redOffset={2}
                        greenOffset={5}
                        blueOffset={8}
                        brightness={70}
                        opacity={0.9}
                        mixBlendMode="screen"
                        borderRadius={12}
                        className="min-w-[120px]"
                      >
                        <div className="py-2">
                          <a href="#" className="block px-4 py-2 text-sm hover:bg-white/20 transition-colors">
                            Products
                          </a>
                          <a href="#" className="block px-4 py-2 text-sm hover:bg-white/20 transition-colors">
                            Company
                          </a>
                        </div>
                      </GlassSurface>
                    </motion.div>
                  )}
                </div>

                <a href="#" className="text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors text-sm">
                  Learn
                </a>
                <a href="#" className="text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors text-sm">
                  Support
                </a>
                <button
                  onClick={onScrollToForm}
                  className="text-[#1A1A1A]/80 hover:text-[#1A1A1A] transition-colors text-sm"
                >
                  Get in touch
                </button>

                <button className="p-2 hover:bg-[#1A1A1A]/10 rounded-full transition-colors">
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu */}
            {showMobileMenu && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="md:hidden mt-4 pt-4 border-t border-white/20"
              >
                <GlassSurface
                  displace={8}
                  distortionScale={-60}
                  redOffset={2}
                  greenOffset={5}
                  blueOffset={10}
                  brightness={75}
                  opacity={0.7}
                  mixBlendMode="screen"
                  borderRadius={12}
                  className="w-full"
                >
                  <div className="p-4 space-y-2">
                    <a href="#" className="block py-2 text-sm hover:bg-white/20 transition-colors rounded">Products</a>
                    <a href="#" className="block py-2 text-sm hover:bg-white/20 transition-colors rounded">Company</a>
                    <a href="#" className="block py-2 text-sm hover:bg-white/20 transition-colors rounded">Learn</a>
                    <a href="#" className="block py-2 text-sm hover:bg-white/20 transition-colors rounded">Support</a>
                    <button
                      onClick={onScrollToForm}
                      className="block py-2 w-full text-left text-sm hover:bg-white/20 transition-colors rounded"
                    >
                      Get in touch
                    </button>
                  </div>
                </GlassSurface>
              </motion.div>
            )}
          </div>
        </GlassSurface>
      </div>
    </header>
  )
}
