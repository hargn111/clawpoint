import { readFile } from 'node:fs/promises'

export async function detectOpenClawVersion(packageJsonPath) {
  try {
    const raw = await readFile(packageJsonPath, 'utf8')
    const pkg = JSON.parse(raw)
    return typeof pkg.version === 'string' ? pkg.version : null
  } catch {
    return null
  }
}
