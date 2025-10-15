#!/usr/bin/env node
/**
 * Bounded Context Boundary Checking Script
 *
 * This script enforces architectural boundaries between Bounded Contexts.
 * It prevents direct cross-BC imports and ensures communication happens
 * only through integration events.
 *
 * Usage: npm run lint:boundaries
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, resolve, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(__dirname, '../..')
const srcDir = join(projectRoot, 'src')

// Define Bounded Context directories
const boundedContexts = {
  'game-engine': join(srcDir, 'game-engine'),
  'game-ui': join(srcDir, 'game-ui'),
  'shared': join(srcDir, 'shared')
}

// Allowed cross-BC dependencies
const allowedDependencies = {
  'game-engine': ['shared'], // game-engine can import from shared
  'game-ui': ['shared'],     // game-ui can import from shared
  'shared': []               // shared cannot import from any BC
}

let hasViolations = false

/**
 * Get all TypeScript/Vue files in a directory recursively
 */
function getSourceFiles(dir) {
  const files = []

  if (!existsSync(dir)) {
    return files
  }

  function walkDir(currentDir) {
    const items = readdirSync(currentDir)

    for (const item of items) {
      const fullPath = join(currentDir, item)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        walkDir(fullPath)
      } else if (item.match(/\.(ts|tsx|vue)$/)) {
        files.push(fullPath)
      }
    }
  }

  walkDir(dir)
  return files
}

/**
 * Extract import statements from a source file
 */
function extractImports(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const imports = []

    // Match ES6 imports: import ... from '...'
    const importRegex = /import\s+(?:[\s\S]*?)\s+from\s+['"`]([^'"`]+)['"`]/g
    let match

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1])
    }

    // Match dynamic imports: import('...')
    const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push(match[1])
    }

    return imports
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message)
    return []
  }
}

/**
 * Determine which BC a file belongs to
 */
function getBoundedContext(filePath) {
  const relativePath = relative(srcDir, filePath)

  if (relativePath.startsWith('game-engine/')) return 'game-engine'
  if (relativePath.startsWith('game-ui/')) return 'game-ui'
  if (relativePath.startsWith('shared/')) return 'shared'

  return null // Files outside BCs (like ui/, infrastructure/)
}

/**
 * Determine which BC an import path targets
 */
function getImportBoundedContext(importPath) {
  // Handle path aliases
  if (importPath.startsWith('@game-engine/')) return 'game-engine'
  if (importPath.startsWith('@game-ui/')) return 'game-ui'
  if (importPath.startsWith('@shared/')) return 'shared'

  // Handle relative imports
  if (importPath.startsWith('../') || importPath.startsWith('./')) {
    // For relative imports, we'd need to resolve the actual target
    // For now, assume they stay within the same BC
    return null
  }

  // Handle absolute imports within src
  if (importPath.startsWith('src/game-engine/')) return 'game-engine'
  if (importPath.startsWith('src/game-ui/')) return 'game-ui'
  if (importPath.startsWith('src/shared/')) return 'shared'

  return null // External dependencies or allowed imports
}

/**
 * Check boundary violations for a single file
 */
function checkFileBoundaries(filePath) {
  const sourceBC = getBoundedContext(filePath)
  if (!sourceBC) return // Skip files outside BCs

  const imports = extractImports(filePath)

  for (const importPath of imports) {
    const targetBC = getImportBoundedContext(importPath)

    if (targetBC && targetBC !== sourceBC) {
      // Check if this cross-BC import is allowed
      const allowedTargets = allowedDependencies[sourceBC] || []

      if (!allowedTargets.includes(targetBC)) {
        console.error(`❌ BOUNDARY VIOLATION`)
        console.error(`   File: ${relative(projectRoot, filePath)}`)
        console.error(`   Source BC: ${sourceBC}`)
        console.error(`   Target BC: ${targetBC}`)
        console.error(`   Import: ${importPath}`)
        console.error(`   Rule: ${sourceBC} BC cannot import from ${targetBC} BC`)
        console.error('')
        hasViolations = true
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking Bounded Context boundaries...\n')

  // Check each BC
  for (const [bcName, bcPath] of Object.entries(boundedContexts)) {
    if (!existsSync(bcPath)) {
      console.log(`⚠️  Bounded Context '${bcName}' directory not found: ${bcPath}`)
      continue
    }

    console.log(`Checking ${bcName} BC...`)
    const files = getSourceFiles(bcPath)

    for (const file of files) {
      checkFileBoundaries(file)
    }
  }

  // Summary
  if (hasViolations) {
    console.error('❌ Boundary check FAILED')
    console.error('Fix the violations above before proceeding.')
    process.exit(1)
  } else {
    console.log('✅ All Bounded Context boundaries are clean!')
    console.log('\nAllowed dependencies:')
    for (const [source, targets] of Object.entries(allowedDependencies)) {
      if (targets.length > 0) {
        console.log(`  ${source} → [${targets.join(', ')}]`)
      } else {
        console.log(`  ${source} → (no dependencies)`)
      }
    }
  }
}

main()
