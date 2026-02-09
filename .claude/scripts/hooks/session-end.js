#!/usr/bin/env node

/**
 * Session End Hook
 * Saves session state for recovery
 */

const path = require('path')
const { writeJsonFile, getClaudeHome, getProjectRoot, getModifiedFiles } = require('../lib/utils')

function main() {
  const claudeHome = getClaudeHome()
  const projectRoot = getProjectRoot()
  const projectName = path.basename(projectRoot)

  // Gather session state
  const modifiedFiles = getModifiedFiles()

  const state = {
    savedAt: new Date().toISOString(),
    projectRoot,
    modifiedFiles: modifiedFiles.slice(0, 10), // Keep last 10
    lastWorkingFile: modifiedFiles[0] || null
  }

  // Save state
  const statePath = path.join(claudeHome, 'session-state', `${projectName}.json`)
  writeJsonFile(statePath, state)

  console.log(`[Session] State saved for ${projectName}`)
  if (modifiedFiles.length > 0) {
    console.log(`[Session] ${modifiedFiles.length} modified files tracked`)
  }
}

main()
