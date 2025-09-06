// Animation durations in milliseconds
export const ANIMATION_DURATION = {
  SHORT: 300,
  MEDIUM: 500,
  LONG: 800,
  VERY_LONG: 1000,
} as const

// Animation delays in milliseconds
export const ANIMATION_DELAY = {
  SHORT: 200,
  MEDIUM: 800,
  LONG: 2000,
} as const

// Scroll behavior
export const SCROLL_BEHAVIOR = {
  SMOOTH: 'smooth',
  AUTO: 'auto',
} as const

// Form configuration
export const FORM_CONFIG = {
  MIN_RUNS: 1,
  MAX_RUNS: 100,
  STATUS_DISPLAY_DURATION: 5000,
  RESET_DELAY: 5000,
} as const

// 3D Scene configuration
export const SCENE_CONFIG = {
  PARTICLE_COUNT: 2000,
  BRANCH_COUNT: 8,
  STRING_COUNT: 15,
  CAMERA_FOV: 45,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,
} as const

// Color palette
export const COLORS = {
  PRIMARY: '#1A1A1A',
  BACKGROUND: '#F5F4F9',
  WHITE: '#FFFFFF',
  ACCENT_PURPLE: '#8B7DFF',
  ACCENT_PINK: '#E1D5E7',
  GROUND: '#D4C5B9',
  TRUNK: '#4A3728',
  STRING: '#E8D5A3',
} as const

// Breakpoints for responsive design
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const
