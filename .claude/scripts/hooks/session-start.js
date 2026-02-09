#!/usr/bin/env node

/**
 * Session Start Hook
 * Loads previous session context if available
 */

const path = require('path')
const { readJsonFile, getClaudeHome, getProjectRoot } = require('../lib/utils')

function main() {
  const claudeHome = getClaudeHome()
  const projectRoot = getProjectRoot()
  const projectName = path.basename(projectRoot)

  // Load session state
  const statePath = path.join(claudeHome, 'session-state', `${projectName}.json`)
  const state = readJsonFile(statePath)

  const output = []

  if (state) {
    output.push(`[Session] Restored context from ${state.savedAt || 'previous session'}`)

    if (state.lastWorkingFile) {
      output.push(`[Session] Last working file: ${state.lastWorkingFile}`)
    }

    if (state.openTasks && state.openTasks.length > 0) {
      output.push(`[Session] Open tasks: ${state.openTasks.length}`)
      state.openTasks.slice(0, 3).forEach(task => {
        output.push(`  - ${task}`)
      })
    }

    if (state.notes) {
      output.push(`[Session] Notes: ${state.notes}`)
    }
  }

  // Detect package manager
  const fs = require('fs')
  const pmIndicators = [
    { file: 'pnpm-lock.yaml', pm: 'pnpm' },
    { file: 'yarn.lock', pm: 'yarn' },
    { file: 'bun.lockb', pm: 'bun' },
    { file: 'package-lock.json', pm: 'npm' }
  ]

  for (const { file, pm } of pmIndicators) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      output.push(`[Session] Package manager: ${pm}`)
      break
    }
  }

  if (output.length > 0) {
    console.log(output.join('\n'))
  }
}

main()
