import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/playfair-display/wght.css'
import '@fontsource-variable/playfair-display/wght-italic.css'
import '@fontsource/barlow-condensed/latin-700.css'
import '@fontsource/barlow-condensed/latin-ext-700.css'
import '@fontsource/barlow-condensed/latin-800.css'
import '@fontsource/barlow-condensed/latin-ext-800.css'
import '@fontsource/source-serif-4/latin-400.css'
import '@fontsource/source-serif-4/latin-ext-400.css'
import '@fontsource/source-serif-4/latin-400-italic.css'
import '@fontsource/source-serif-4/latin-ext-400-italic.css'
import '@fontsource/source-serif-4/latin-600.css'
import '@fontsource/source-serif-4/latin-ext-600.css'
import './styles.css'
import App from './App'
import { gorunumuUygula } from './lib/ayarlar'

gorunumuUygula()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
