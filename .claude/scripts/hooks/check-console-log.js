#!/usr/bin/env node

/**
 * Check for console.log statements in modified files
 * Warns but doesn't block
 */

const path = require('path')
const { getModifiedFiles, getProjectRoot, searchInFile, isGitRepo } = require('../lib/utils')

function main() {
  if (!isGitRepo()) {
    return
  }

  const projectRoot = getProjectRoot()
  const modifiedFiles = getModifiedFiles()

  // Filter for JS/TS files only
  const jsFiles = modifiedFiles.filter(f =>
    /\.(ts|tsx|js|jsx)$/.test(f) &&
    !f.includes('.test.') &&
    !f.includes('.spec.') &&
    !f.includes('node_modules')
  )

  if (jsFiles.length === 0) {
    return
  }

  const findings = []

  jsFiles.forEach(file => {
    const filePath = path.join(projectRoot, file)
    const matches = searchInFile(filePath, /console\.(log|warn|error|debug|info)\(/)

    if (matches.length > 0) {
      findings.push({
        file,
        matches: matches.slice(0, 5) // Limit to 5 per file
      })
    }
  })

  if (findings.length === 0) {
    return
  }

  console.log('[Hook] console.log statements found - consider removing before commit:')
  findings.forEach(({ file, matches }) => {
    console.log(`  ${file}:`)
    matches.forEach(m => {
      console.log(`    Line ${m.line}: ${m.content.substring(0, 60)}...`)
    })
  })
}

main()
