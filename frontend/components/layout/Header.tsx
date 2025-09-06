"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, Menu, Grid3X3 } from "lucide-react"

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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-white/60 backdrop-blur-md backdrop-saturate-150 border-b border-white/30 shadow-md'
        : 'bg-white/30 backdrop-blur-md backdrop-saturate-150 border-b border-white/20 shadow-sm'
      }`}>
      <div className="container mx-auto px-6 py-4">
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
                  className="absolute top-full left-0 mt-2 bg-white/80 backdrop-blur-md rounded-lg shadow-lg border border-white/20 py-2 min-w-[120px]"
                >
                  <a href="#" className="block px-4 py-2 text-sm hover:bg-white/40 transition-colors">
                    Products
                  </a>
                  <a href="#" className="block px-4 py-2 text-sm hover:bg-white/40 transition-colors">
                    Company
                  </a>
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
            className="md:hidden mt-4 pb-4 border-t border-white/20 pt-4 bg-white/30 backdrop-blur-md rounded-lg"
          >
            <div className="space-y-2">
              <a href="#" className="block py-2 text-sm">Products</a>
              <a href="#" className="block py-2 text-sm">Company</a>
              <a href="#" className="block py-2 text-sm">Learn</a>
              <a href="#" className="block py-2 text-sm">Support</a>
              <button onClick={onScrollToForm} className="block py-2 w-full text-left text-sm">
                Get in touch
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  )
}
