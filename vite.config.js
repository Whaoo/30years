import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mode test : date simulée (?date=), jeux ouverts à tout moment (?jeu=), panneau « Test » en bas à gauche.
// Activé automatiquement :
//   - en local avec `npm run dev` ;
//   - sur les préversions Cloudflare Pages, c'est-à-dire toute branche autre que main (dev.30years.pages.dev).
// Sur main (la production), __TEST_MODE__ vaut false et le code de test n'est même pas inclus dans le site.
// Cloudflare Pages donne la branche et le commit au moment du build (CF_PAGES_BRANCH, CF_PAGES_COMMIT_SHA).
export default defineConfig(({ command }) => {
  const branch = process.env.CF_PAGES_BRANCH || (command === 'serve' ? 'local' : '')
  const testMode = command === 'serve' || (branch !== '' && branch !== 'main')
  return {
    plugins: [react()],
    define: {
      __TEST_MODE__: JSON.stringify(testMode),
      __BUILD_INFO__: JSON.stringify({ branch, commit: (process.env.CF_PAGES_COMMIT_SHA || '').slice(0, 7) }),
    },
  }
})
