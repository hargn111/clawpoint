import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, '.release', 'clawpoint')

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

await cp(path.join(root, 'dist'), path.join(outDir, 'dist'), { recursive: true })
await cp(path.join(root, 'server'), path.join(outDir, 'server'), { recursive: true })
await cp(path.join(root, 'ops'), path.join(outDir, 'ops'), { recursive: true })
await cp(path.join(root, 'server.mjs'), path.join(outDir, 'server.mjs'))
await cp(path.join(root, 'package.json'), path.join(outDir, 'package.json'))
await cp(path.join(root, 'package-lock.json'), path.join(outDir, 'package-lock.json'))
await cp(path.join(root, '.env.production.example'), path.join(outDir, '.env.production.example'))

await writeFile(
  path.join(outDir, 'DEPLOYMENT.txt'),
  [
    'Clawpoint production bundle',
    '',
    'Run with a plain Node environment.',
    'Required runtime files are included in this bundle.',
    'Use .env.production.example as the starting environment template.',
    'Install the user service with ops/deploy/install-service.sh.',
    'Deploy a bundle with ops/deploy/deploy-release.sh <bundle-dir>.',
    '',
    'Typical start command:',
    'node server.mjs',
  ].join('\n'),
)

console.log(`release-ready:${outDir}`)
