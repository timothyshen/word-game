/**
 * Utility functions for Claude Code hooks
 * Cross-platform compatible (macOS, Linux, Windows)
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

/**
 * Get the project root directory
 * @returns {string} Absolute path to project root
 */
function getProjectRoot() {
  // Try to find git root
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
    return gitRoot
  } catch {
    // Fall back to current directory
    return process.cwd()
  }
}

/**
 * Get modified files from git
 * @param {string} [base='HEAD'] - Base reference for diff
 * @returns {string[]} Array of modified file paths
 */
function getModifiedFiles(base = 'HEAD') {
  try {
    const output = execSync(`git diff --name-only ${base}`, {
      encoding: 'utf8',
      cwd: getProjectRoot(),
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return output.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Check if we're in a git repository
 * @returns {boolean}
 */
function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return true
  } catch {
    return false
  }
}

/**
 * Check if running inside tmux
 * @returns {boolean}
 */
function isInTmux() {
  return !!process.env.TMUX
}

/**
 * Read JSON file safely
 * @param {string} filePath - Path to JSON file
 * @returns {object|null} Parsed JSON or null
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

/**
 * Write JSON file
 * @param {string} filePath - Path to JSON file
 * @param {object} data - Data to write
 */
function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

/**
 * Get Claude home directory
 * @returns {string} Path to ~/.claude
 */
function getClaudeHome() {
  const home = process.env.HOME || process.env.USERPROFILE
  return path.join(home, '.claude')
}

/**
 * Search for pattern in file
 * @param {string} filePath - File to search
 * @param {RegExp} pattern - Pattern to search for
 * @returns {Array<{line: number, content: string}>} Matches
 */
function searchInFile(filePath, pattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    const matches = []

    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matches.push({ line: index + 1, content: line.trim() })
      }
    })

    return matches
  } catch {
    return []
  }
}

module.exports = {
  getProjectRoot,
  getModifiedFiles,
  isGitRepo,
  isInTmux,
  readJsonFile,
  writeJsonFile,
  getClaudeHome,
  searchInFile
}
