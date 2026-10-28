import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest runs with globals disabled, so Testing Library cannot register its
// automatic cleanup. Without this, rendered trees leak between tests.
afterEach(() => { cleanup() })
