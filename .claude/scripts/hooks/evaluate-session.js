#!/usr/bin/env node

/**
 * Evaluate Session Hook
 * Extracts reusable patterns from the session for continuous learning
 */

const path = require('path')
const fs = require('fs')
const { getClaudeHome, getProjectRoot, getModifiedFiles, readJsonFile, writeJsonFile } = require('../lib/utils')

function main() {
  const claudeHome = getClaudeHome()
  const projectRoot = getProjectRoot()
  const projectName = path.basename(projectRoot)

  // Get modified files to analyze
  const modifiedFiles = getModifiedFiles()

  if (modifiedFiles.length === 0) {
    console.log('[Learning] No modifications to evaluate')
    return
  }

  // Analyze patterns
  const patterns = []

  // Check for new test files
  const newTests = modifiedFiles.filter(f => f.includes('.test.') || f.includes('.spec.'))
  if (newTests.length > 0) {
    patterns.push({
      type: 'testing',
      description: `Added ${newTests.length} test files`,
      files: newTests,
      confidence: 0.8
    })
  }

  // Check for API routes
  const apiRoutes = modifiedFiles.filter(f => f.includes('/api/'))
  if (apiRoutes.length > 0) {
    patterns.push({
      type: 'api',
      description: `Modified ${apiRoutes.length} API routes`,
      files: apiRoutes,
      confidence: 0.7
    })
  }

  // Check for component changes
  const components = modifiedFiles.filter(f => f.includes('/components/'))
  if (components.length > 0) {
    patterns.push({
      type: 'ui',
      description: `Updated ${components.length} components`,
      files: components,
      confidence: 0.7
    })
  }

  if (patterns.length === 0) {
    console.log('[Learning] No significant patterns detected')
    return
  }

  // Load existing patterns
  const patternsPath = path.join(claudeHome, 'learned-patterns', `${projectName}.json`)
  const existing = readJsonFile(patternsPath) || { patterns: [], lastUpdated: null }

  // Add new patterns with timestamp
  const timestamp = new Date().toISOString()
  patterns.forEach(p => {
    p.timestamp = timestamp
    existing.patterns.push(p)
  })

  // Keep only recent patterns (last 50)
  existing.patterns = existing.patterns.slice(-50)
  existing.lastUpdated = timestamp

  // Save
  writeJsonFile(patternsPath, existing)

  console.log(`[Learning] Extracted ${patterns.length} patterns:`)
  patterns.forEach(p => {
    console.log(`  - ${p.type}: ${p.description} (confidence: ${p.confidence})`)
  })
}

main()
