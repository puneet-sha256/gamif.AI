import fs from 'fs-extra'

let tempSequence = 0

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

export async function atomicWriteJson(filePath: string, value: unknown): Promise<void> {
  const tempPath = `${filePath}.${process.pid}.${tempSequence++}.tmp`
  await fs.writeJson(tempPath, value, { spaces: 2 })

  try {
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        await fs.rename(tempPath, filePath)
        return
      } catch (error: unknown) {
        const code = (error as { code?: string }).code
        const retryable = code === 'EPERM' || code === 'EBUSY' || code === 'EACCES'
        if (!retryable || attempt === 11) throw error
        await delay(Math.min(25 * (attempt + 1), 250))
      }
    }
  } finally {
    if (await fs.pathExists(tempPath)) await fs.remove(tempPath)
  }
}
