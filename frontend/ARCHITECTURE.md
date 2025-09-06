# Frontend Modular Architecture

## Overview
The frontend has been refactored into a modular, maintainable architecture that separates concerns and improves code organization.

## Directory Structure

```
frontend/
├── app/
│   ├── page.tsx          # Main page component (now simplified)
│   ├── config.ts         # Application configuration
│   └── ...
├── components/
│   ├── index.ts          # Component exports
│   ├── layout/
│   │   ├── Header.tsx    # Navigation header
│   │   └── Footer.tsx    # Footer section
│   ├── hero/
│   │   └── HeroSection.tsx # Hero section with 3D integration
│   ├── three-scene/
│   │   └── TreeScene.tsx # Three.js 3D scene component
│   ├── form/
│   │   ├── MultiStepForm.tsx # Main form container
│   │   ├── StepIndicator.tsx # Progress indicator
│   │   ├── StepOne.tsx       # File upload step
│   │   └── StepTwo.tsx       # Personal details step
│   └── ...
├── hooks/
│   ├── useFormState.ts       # Form state management
│   └── useSubmissionStatus.ts # Submission status handling
├── services/
│   └── submissionService.ts  # API communication layer
├── utils/
│   └── fileValidation.ts     # File validation utilities
└── constants/
    └── index.ts              # Application constants
```

## Component Breakdown

### Main Components

#### `app/page.tsx`
- **Previous size**: ~1100 lines (40KB+)
- **Current size**: ~50 lines
- **Purpose**: Main page orchestrator that combines all components
- **Dependencies**: Header, Footer, HeroSection, MultiStepForm, SubmissionStatus

#### `components/layout/Header.tsx`
- **Purpose**: Fixed navigation header with mobile responsive menu
- **Features**: Search dropdown, navigation links, mobile menu
- **Props**: `onScrollToForm` callback

#### `components/layout/Footer.tsx`
- **Purpose**: Footer with company information and links
- **Features**: Social media links, navigation sections

#### `components/hero/HeroSection.tsx`
- **Purpose**: Hero section with integrated 3D scene
- **Features**: Animated headline, scroll indicator, audio button
- **Props**: `onScrollToForm` callback

#### `components/three-scene/TreeScene.tsx`
- **Purpose**: Three.js 3D animated scene
- **Features**: 
  - Animated tree with particles
  - Cicada wings animation
  - Dynamic lighting
  - Performance optimized

### Form Components

#### `components/form/MultiStepForm.tsx`
- **Purpose**: Multi-step form container
- **Features**: Step navigation, form submission handling
- **Uses**: Custom hooks for state management

#### `components/form/StepOne.tsx`
- **Purpose**: File upload and configuration step
- **Features**: 
  - File validation
  - PDB file preview integration
  - Drag and drop support
  - Folder upload support

#### `components/form/StepTwo.tsx`
- **Purpose**: Personal information collection
- **Features**: Form validation, responsive layout

#### `components/form/StepIndicator.tsx`
- **Purpose**: Visual step progress indicator
- **Features**: Dynamic styling based on current step

## Custom Hooks

### `useFormState`
- Manages complete form state
- Provides navigation methods
- Validation helpers
- Form reset functionality

### `useSubmissionStatus`
- Handles submission states
- Auto-clear functionality
- Error and success management

## Services

### `submissionService.ts`
- Centralized API communication
- Error handling
- Type-safe interfaces
- Network error detection

## Utilities

### `fileValidation.ts`
- File type validation
- File size validation
- PDB file detection
- Validation message generation

## Constants

### `constants/index.ts`
- Animation configurations
- Color palette
- 3D scene parameters
- Responsive breakpoints

## Benefits of Modularization

1. **Maintainability**: Each component has a single responsibility
2. **Reusability**: Components can be reused across different pages
3. **Testing**: Easier to unit test individual components
4. **Performance**: Potential for code splitting and lazy loading
5. **Collaboration**: Multiple developers can work on different components
6. **Debugging**: Easier to isolate and fix issues
7. **Scalability**: Easy to add new features without affecting existing code

## Usage Example

```tsx
// Import specific components
import { Header, Footer, HeroSection } from '@/components'
import MultiStepForm from '@/components/form/MultiStepForm'

// Use hooks for state management
import { useFormState } from '@/hooks/useFormState'
import { useSubmissionStatus } from '@/hooks/useSubmissionStatus'

// Use services for API calls
import { SubmissionService } from '@/services/submissionService'
```

## Future Improvements

1. **Lazy Loading**: Implement dynamic imports for heavy components (Three.js scene)
2. **Error Boundaries**: Add more granular error boundaries
3. **Testing**: Add unit tests for all components
4. **Storybook**: Create component documentation with Storybook
5. **Performance**: Add React.memo for optimization where needed
6. **Accessibility**: Enhance ARIA labels and keyboard navigation
7. **Internationalization**: Prepare for multi-language support

## Migration Notes

- All existing functionality has been preserved
- No breaking changes to the user experience
- Backend API integration remains unchanged
- All file upload and validation logic maintained
