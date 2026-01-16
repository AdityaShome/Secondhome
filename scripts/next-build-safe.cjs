const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

function hasBuildOutput() {
  // Heuristics: if either exists, Next produced meaningful build output.
  // BUILD_ID is usually present for production builds; build-manifest can exist in compile mode.
  return (
    fs.existsSync(path.join(process.cwd(), '.next', 'BUILD_ID')) ||
    fs.existsSync(path.join(process.cwd(), '.next', 'build-manifest.json')) ||
    fs.existsSync(path.join(process.cwd(), '.next', 'prerender-manifest.json'))
  )
}

function isWindowsKillEpermOutput(output) {
  return /\bkill\s+EPERM\b/i.test(output) || /\bcode:\s*'EPERM'\b/i.test(output)
}

async function main() {
  const nextBin = require.resolve('next/dist/bin/next')
  const args = process.argv.slice(2)

  const child = spawn(process.execPath, [nextBin, ...args], {
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
    env: process.env,
  })

  let combinedOutput = ''

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk)
    combinedOutput += chunk.toString('utf8')
  })

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk)
    combinedOutput += chunk.toString('utf8')
  })

  child.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })

  child.on('close', (code) => {
    if (code === 0) process.exit(0)

    const isWin = process.platform === 'win32'
    const looksLikeKillEperm = isWindowsKillEpermOutput(combinedOutput)

    if (isWin && looksLikeKillEperm && hasBuildOutput()) {
      // eslint-disable-next-line no-console
      console.warn(
        'Warning: Next.js exited with Windows cleanup error (kill EPERM), but build artifacts exist. Treating as success.'
      )
      process.exit(0)
    }

    process.exit(code || 1)
  })
}

main()
