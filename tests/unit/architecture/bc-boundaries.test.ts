import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

/**
 * BC 邊界測試：驗證 Bounded Context 隔離原則
 *
 * 目的：確保 game-engine 和 game-ui 兩個 BC 之間沒有不當的直接依賴
 *
 * 測試策略：
 * 1. 檢查 game-engine BC 不可 import game-ui BC 的模組
 * 2. 檢查 game-ui BC 不可 import game-engine BC 的模組
 * 3. 允許兩者都 import shared/ 的模組
 * 4. 掃描所有 TypeScript 檔案的 import 語句
 */

const projectRoot = join(__dirname, '../../..')

/**
 * 遞迴掃描目錄下的所有 TypeScript 檔案
 */
function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = []

  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      // 跳過 node_modules, dist, coverage 等目錄
      if (['node_modules', 'dist', 'coverage', '.git', 'specs', 'tests'].includes(item)) {
        continue
      }
      files.push(...getAllTypeScriptFiles(fullPath))
    } else if (stat.isFile() && /\.(ts|tsx)$/.test(item)) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * 提取檔案中的所有 import 語句
 */
function extractImports(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8')
  // 支援 import type 語法
  const importRegex = /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g

  const imports: string[] = []
  let match: RegExpExecArray | null

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1])
  }

  return imports
}

/**
 * 檢查 import 路徑是否違反 BC 邊界規則
 */
function checkBoundaryViolation(
  sourceFile: string,
  sourceBc: 'game-engine' | 'game-ui',
  importPath: string
): { violated: boolean; message?: string } {
  // 允許的 import 模式
  const allowedPatterns = [
    /^@\/shared\//,        // shared BC (@ alias)
    /^@shared\//,          // shared BC
    /^shared\//,           // shared BC (相對路徑)
    /^\.\.\//,             // 相對路徑（可能跨 BC，需進一步檢查）
    /^\.\//,               // 同一目錄（允許）
    /^@\w+\//,             // 其他別名（如 @game-engine, @game-ui）
    /^[a-z]/,              // node_modules 套件
  ]

  // 禁止的 import 模式
  const forbiddenPatterns: { bc: string; pattern: RegExp }[] = []

  if (sourceBc === 'game-engine') {
    // game-engine 不可 import game-ui
    forbiddenPatterns.push(
      { bc: 'game-ui', pattern: /^@\/game-ui\// },
      { bc: 'game-ui', pattern: /^@game-ui\// },
      { bc: 'game-ui', pattern: /^\.\.\/game-ui\// },
      { bc: 'game-ui', pattern: /game-ui\// }
    )
  } else if (sourceBc === 'game-ui') {
    // game-ui 不可 import game-engine
    forbiddenPatterns.push(
      { bc: 'game-engine', pattern: /^@\/game-engine\// },
      { bc: 'game-engine', pattern: /^@game-engine\// },
      { bc: 'game-engine', pattern: /^\.\.\/game-engine\// },
      { bc: 'game-engine', pattern: /game-engine\// }
    )
  }

  // 檢查是否違反邊界
  for (const { bc, pattern } of forbiddenPatterns) {
    if (pattern.test(importPath)) {
      return {
        violated: true,
        message: `${sourceBc} BC 不可直接 import ${bc} BC\n  檔案: ${relative(projectRoot, sourceFile)}\n  Import: ${importPath}`,
      }
    }
  }

  return { violated: false }
}

describe('BC Boundaries Tests', () => {
  const gameEngineDir = join(projectRoot, 'src/game-engine')
  const gameUiDir = join(projectRoot, 'src/game-ui')

  describe('Game Engine BC', () => {
    it('不應該 import game-ui BC 的模組', () => {
      const files = getAllTypeScriptFiles(gameEngineDir)
      expect(files.length).toBeGreaterThan(0)

      const violations: string[] = []

      for (const file of files) {
        const imports = extractImports(file)

        for (const importPath of imports) {
          const result = checkBoundaryViolation(file, 'game-engine', importPath)

          if (result.violated && result.message) {
            violations.push(result.message)
          }
        }
      }

      if (violations.length > 0) {
        console.error('\n❌ BC 邊界違規:\n' + violations.join('\n\n'))
      }

      expect(violations).toHaveLength(0)
    })

    it('可以 import shared BC 的模組', () => {
      const files = getAllTypeScriptFiles(gameEngineDir)
      const hasSharedImports = files.some((file) => {
        const imports = extractImports(file)
        return imports.some((importPath) => /^@\/shared\/|^@shared\/|^shared\//.test(importPath))
      })

      // 至少應該有一些檔案 import shared BC
      expect(hasSharedImports).toBe(true)
    })

    it('domain 層不應該 import 外部 node_modules 套件（除了型別工具）', () => {
      const domainDir = join(gameEngineDir, 'domain')
      const files = getAllTypeScriptFiles(domainDir)

      const violations: string[] = []
      const allowedPackages = ['type-fest', '@types/', 'tslib'] // 允許的型別工具套件

      for (const file of files) {
        const imports = extractImports(file)

        for (const importPath of imports) {
          // 檢查是否為 node_modules 套件（不是相對路徑、不是 @ 別名）
          const isNodeModule = /^[a-z]/.test(importPath) && !importPath.startsWith('.')

          if (isNodeModule) {
            // 檢查是否在允許清單中
            const isAllowed = allowedPackages.some((pkg) => importPath.startsWith(pkg))

            if (!isAllowed) {
              violations.push(
                `Domain 層不應該依賴外部套件\n  檔案: ${relative(projectRoot, file)}\n  Import: ${importPath}`
              )
            }
          }
        }
      }

      if (violations.length > 0) {
        console.error('\n❌ Domain 層純淨性違規:\n' + violations.join('\n\n'))
      }

      expect(violations).toHaveLength(0)
    })
  })

  describe('Game UI BC', () => {
    it('不應該 import game-engine BC 的模組', () => {
      const files = getAllTypeScriptFiles(gameUiDir)
      expect(files.length).toBeGreaterThan(0)

      const violations: string[] = []

      for (const file of files) {
        const imports = extractImports(file)

        for (const importPath of imports) {
          const result = checkBoundaryViolation(file, 'game-ui', importPath)

          if (result.violated && result.message) {
            violations.push(result.message)
          }
        }
      }

      if (violations.length > 0) {
        console.error('\n❌ BC 邊界違規:\n' + violations.join('\n\n'))
      }

      expect(violations).toHaveLength(0)
    })

    it('可以 import shared BC 的模組', () => {
      const files = getAllTypeScriptFiles(gameUiDir)
      const hasSharedImports = files.some((file) => {
        const imports = extractImports(file)
        return imports.some((importPath) => /^@\/shared\/|^@shared\/|^shared\//.test(importPath))
      })

      // 至少應該有一些檔案 import shared BC
      expect(hasSharedImports).toBe(true)
    })

    it('domain 層不應該依賴 Vue 或 Pinia（應該在 presentation 層）', () => {
      const domainDir = join(gameUiDir, 'domain')
      const files = getAllTypeScriptFiles(domainDir)

      const violations: string[] = []
      const forbiddenPackages = ['vue', 'pinia', '@vue/', 'vue-router']

      for (const file of files) {
        const imports = extractImports(file)

        for (const importPath of imports) {
          const isForbidden = forbiddenPackages.some((pkg) => importPath.startsWith(pkg))

          if (isForbidden) {
            violations.push(
              `UI Domain 層不應該依賴 UI 框架\n  檔案: ${relative(projectRoot, file)}\n  Import: ${importPath}`
            )
          }
        }
      }

      if (violations.length > 0) {
        console.error('\n❌ UI Domain 層純淨性違規:\n' + violations.join('\n\n'))
      }

      expect(violations).toHaveLength(0)
    })
  })

  describe('Shared BC', () => {
    it('不應該依賴 game-engine 或 game-ui BC', () => {
      const sharedDir = join(projectRoot, 'src/shared')
      const files = getAllTypeScriptFiles(sharedDir)

      if (files.length === 0) {
        // shared BC 可能沒有檔案，這是允許的
        return
      }

      const violations: string[] = []

      for (const file of files) {
        const imports = extractImports(file)

        for (const importPath of imports) {
          if (
            /^@\/game-engine\/|^@game-engine\/|game-engine\//.test(importPath) ||
            /^@\/game-ui\/|^@game-ui\/|game-ui\//.test(importPath)
          ) {
            violations.push(
              `shared BC 不應該依賴其他 BC\n  檔案: ${relative(projectRoot, file)}\n  Import: ${importPath}`
            )
          }
        }
      }

      if (violations.length > 0) {
        console.error('\n❌ Shared BC 隔離違規:\n' + violations.join('\n\n'))
      }

      expect(violations).toHaveLength(0)
    })
  })

  describe('Architecture Summary', () => {
    it('應該顯示專案 BC 架構統計', () => {
      const gameEngineFiles = getAllTypeScriptFiles(gameEngineDir)
      const gameUiFiles = getAllTypeScriptFiles(gameUiDir)
      const sharedFiles = getAllTypeScriptFiles(join(projectRoot, 'src/shared'))

      console.log('\n📊 BC 架構統計:')
      console.log(`  game-engine BC: ${gameEngineFiles.length} 個檔案`)
      console.log(`  game-ui BC:     ${gameUiFiles.length} 個檔案`)
      console.log(`  shared BC:      ${sharedFiles.length} 個檔案`)
      console.log(`  總計:           ${gameEngineFiles.length + gameUiFiles.length + sharedFiles.length} 個檔案\n`)

      expect(gameEngineFiles.length).toBeGreaterThan(0)
      expect(gameUiFiles.length).toBeGreaterThan(0)
    })
  })
})
