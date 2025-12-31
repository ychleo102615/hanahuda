# Quickstart: Backend Testing & Logging Enhancement

**Feature Branch**: `009-backend-testing-logging`

## Prerequisites

- Node.js 20.19+ 或 22.12+
- PostgreSQL 14+（本地或 Docker）
- pnpm / npm

## 快速開始

### 1. 環境設置

```bash
# 切換到 feature branch
git checkout 009-backend-testing-logging

# 安裝依賴
cd front-end
npm install

# 啟動資料庫
npm run db:up
```

### 2. 執行測試

```bash
# 執行所有 server 測試
npm run test:unit:server

# 只執行 Domain Layer 測試
npm run test:unit:domain

# 只執行 Application Layer 測試
npm run test:unit:application

# 執行測試並生成覆蓋率報告
npm run test:unit:server -- --coverage
```

### 3. 資料庫 Migration

```bash
# 生成 migration
npm run db:generate

# 執行 migration
npm run db:migrate
```

---

## 測試檔案結構

```
front-end/server/
├── __tests__/
│   ├── mocks/                    # 共用 mock 實作
│   │   ├── gameStoreMock.ts
│   │   ├── eventPublisherMock.ts
│   │   └── ...
│   ├── fixtures/                 # 測試資料
│   │   ├── cards.ts              # 標準卡片組合
│   │   └── games.ts              # 遊戲狀態 fixtures
│   ├── domain/                   # Domain Layer 測試
│   │   ├── services/
│   │   │   ├── yakuDetectionService.test.ts
│   │   │   ├── matchingService.test.ts
│   │   │   └── ...
│   │   └── game/
│   │       ├── game.test.ts
│   │       └── round.test.ts
│   └── application/              # Application Layer 測試
│       └── use-cases/
│           ├── joinGameUseCase.test.ts
│           ├── playHandCardUseCase.test.ts
│           └── ...
```

---

## 撰寫測試指南

### Domain Layer 測試（純函數）

```typescript
// server/__tests__/domain/services/matchingService.test.ts
import { describe, it, expect } from 'vitest'
import { findMatchableTargets } from '~/server/domain/services/matchingService'

describe('matchingService', () => {
  describe('findMatchableTargets', () => {
    it('應找到同月份的配對目標', () => {
      const handCard = '0101'  // 一月松
      const field = ['0102', '0201', '0301']  // 一月、二月、三月

      const targets = findMatchableTargets(handCard, field)

      expect(targets).toEqual(['0102'])
    })

    it('無配對時應返回空陣列', () => {
      const handCard = '0101'
      const field = ['0201', '0301']

      const targets = findMatchableTargets(handCard, field)

      expect(targets).toEqual([])
    })
  })
})
```

### Application Layer 測試（使用 Mock）

```typescript
// server/__tests__/application/use-cases/playHandCardUseCase.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlayHandCardUseCase } from '~/server/application/use-cases/playHandCardUseCase'
import { createMockGameStore } from '../mocks/gameStoreMock'
import { createMockEventPublisher } from '../mocks/eventPublisherMock'

describe('PlayHandCardUseCase', () => {
  let useCase: PlayHandCardUseCase
  let mockGameStore: ReturnType<typeof createMockGameStore>
  let mockEventPublisher: ReturnType<typeof createMockEventPublisher>

  beforeEach(() => {
    mockGameStore = createMockGameStore()
    mockEventPublisher = createMockEventPublisher()
    useCase = new PlayHandCardUseCase(mockGameStore, mockEventPublisher, ...)
  })

  it('出牌後應發布事件', async () => {
    // Arrange
    mockGameStore.get.mockReturnValue(createTestGame())

    // Act
    await useCase.execute({
      gameId: 'game-1',
      playerId: 'player-1',
      cardId: '0101',
    })

    // Assert
    expect(mockEventPublisher.publish).toHaveBeenCalled()
  })
})
```

---

## GameLog 使用指南

### 記錄事件

```typescript
import { gameLogRepository } from '~/server/utils/container'

// Fire-and-forget 記錄
gameLogRepository.logAsync({
  gameId: 'uuid-here',
  playerId: 'player-1',
  eventType: 'CARD_PLAYED_FROM_HAND',
  payload: { cardId: '0101', targetCardId: '0102' },
})
```

### 查詢遊戲記錄

```typescript
// 取得特定遊戲的所有事件（按時間排序）
const logs = await gameLogRepository.findByGameId('uuid-here')

// 重播遊戲
const gameState = replayGame(logs)
```

---

## 常見問題

### Q: 測試跑不過，找不到模組？

確認 `vitest.server.config.ts` 中的 alias 設定正確：

```typescript
resolve: {
  alias: {
    '~': fileURLToPath(new URL('./server', import.meta.url)),
    '~~': fileURLToPath(new URL('./', import.meta.url)),
  },
}
```

### Q: 如何只跑特定測試檔案？

```bash
npm run test:unit:server -- server/__tests__/domain/services/yakuDetectionService.test.ts
```

### Q: 如何查看測試覆蓋率？

```bash
npm run test:unit:server -- --coverage
# 報告會生成在 coverage/ 目錄
```

---

## 相關文件

- [spec.md](./spec.md) - 功能規格
- [research.md](./research.md) - 技術研究
- [data-model.md](./data-model.md) - 資料模型
- [contracts/game-log-port.md](./contracts/game-log-port.md) - GameLog 介面契約
