import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import './styles.css'
import { router } from './router'
import { installRovingFocus } from './lib/a11y'

// Suppress browser extension errors
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.includes('content_script.js')) {
    event.preventDefault();
    return false;
  }
});

installRovingFocus()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
