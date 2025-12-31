/**
 * GameLog 清理功能測試腳本
 *
 * 使用方式：
 * 1. 確保本地資料庫已啟動
 * 2. 執行：npx tsx --env-file=.env scripts/test-gamelog-cleanup.ts
 *
 * 測試流程：
 * 1. 插入假資料（8 天前和今天）
 * 2. 執行清理
 * 3. 驗證結果
 */

import { lt, count } from 'drizzle-orm'
import { db } from '../server/utils/db'
import { gameLogs } from '../server/database/schema'

const RETENTION_DAYS = 7

async function insertTestData() {
  console.log('📝 插入測試資料...')

  const now = new Date()
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  // 插入 8 天前的資料（應該被刪除）
  await db.insert(gameLogs).values([
    {
      sequenceNumber: 99901,
      gameId: '00000000-0000-0000-0000-000000000001',
      playerId: 'test-player-1',
      eventType: 'CreateGame',
      payload: { test: true, age: '8_days_ago' },
      createdAt: eightDaysAgo,
    },
    {
      sequenceNumber: 99902,
      gameId: '00000000-0000-0000-0000-000000000001',
      playerId: 'test-player-1',
      eventType: 'JoinExistingGame',
      payload: { test: true, age: '8_days_ago' },
      createdAt: eightDaysAgo,
    },
  ])

  // 插入 2 天前的資料（不應該被刪除）
  await db.insert(gameLogs).values([
    {
      sequenceNumber: 99903,
      gameId: '00000000-0000-0000-0000-000000000002',
      playerId: 'test-player-2',
      eventType: 'CreateGame',
      payload: { test: true, age: '2_days_ago' },
      createdAt: twoDaysAgo,
    },
  ])

  // 插入今天的資料（不應該被刪除）
  await db.insert(gameLogs).values([
    {
      sequenceNumber: 99904,
      gameId: '00000000-0000-0000-0000-000000000003',
      playerId: 'test-player-3',
      eventType: 'CreateGame',
      payload: { test: true, age: 'today' },
      createdAt: now,
    },
  ])

  console.log('✅ 已插入 4 筆測試資料：')
  console.log('   - 2 筆 8 天前（應該被刪除）')
  console.log('   - 1 筆 2 天前（不應該被刪除）')
  console.log('   - 1 筆今天（不應該被刪除）')
}

async function countRecords() {
  const result = await db.select({ count: count() }).from(gameLogs)
  return result[0]?.count ?? 0
}

async function performCleanup() {
  console.log('\n🧹 執行清理...')

  const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
  console.log(`   截止日期: ${cutoffDate.toISOString()}`)

  const deleted = await db
    .delete(gameLogs)
    .where(lt(gameLogs.createdAt, cutoffDate))
    .returning({ id: gameLogs.id })

  console.log(`✅ 已刪除 ${deleted.length} 筆記錄`)
  return deleted.length
}

async function main() {
  console.log('='.repeat(50))
  console.log('GameLog 清理功能測試')
  console.log('='.repeat(50))

  try {
    // 1. 查看目前記錄數
    const beforeCount = await countRecords()
    console.log(`\n📊 目前記錄數: ${beforeCount}`)

    // 2. 插入測試資料
    await insertTestData()

    // 3. 確認插入後的記錄數
    const afterInsertCount = await countRecords()
    console.log(`\n📊 插入後記錄數: ${afterInsertCount}`)

    // 4. 執行清理
    const deletedCount = await performCleanup()

    // 5. 確認清理後的記錄數
    const afterCleanupCount = await countRecords()
    console.log(`\n📊 清理後記錄數: ${afterCleanupCount}`)

    // 6. 驗證結果
    console.log('\n' + '='.repeat(50))
    console.log('驗證結果')
    console.log('='.repeat(50))

    const expectedDeleted = 2 // 8 天前的 2 筆
    if (deletedCount >= expectedDeleted) {
      console.log(`✅ 清理成功！刪除了 ${deletedCount} 筆超過 7 天的記錄`)
    } else {
      console.log(`⚠️ 預期刪除 ${expectedDeleted} 筆，實際刪除 ${deletedCount} 筆`)
    }

    // 7. 清理測試資料（可選）
    console.log('\n🧹 清理剩餘的測試資料...')
    await db.delete(gameLogs).where(
      lt(gameLogs.sequenceNumber, 100000)
    )
    const finalCount = await countRecords()
    console.log(`📊 最終記錄數: ${finalCount}`)

  } catch (error) {
    console.error('❌ 測試失敗:', error)
    process.exit(1)
  }

  console.log('\n✅ 測試完成！')
  process.exit(0)
}

main()
