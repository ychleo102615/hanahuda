# Quickstart: 事件時間倒數功能

**Feature Branch**: `006-event-countdown-timer`
**Date**: 2025-11-28

## Overview

本文檔提供事件時間倒數功能的快速實作指南。

---

## 1. Prerequisites

確保以下條件滿足：
- Node.js 18+
- pnpm (package manager)
- 已完成 `front-end` 依賴安裝

```bash
cd front-end
pnpm install
```

---

## 2. File Changes Summary

### 2.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `front-end/src/user-interface/application/types/events.ts` | Modify | 新增 timeout 欄位到事件型別 |
| `front-end/src/user-interface/adapter/stores/uiState.ts` | Modify | 新增倒數狀態和 actions |
| `front-end/src/user-interface/application/ports/output/notification.port.ts` | Modify | 擴展 TriggerUIEffectPort |
| `front-end/src/user-interface/application/use-cases/event-handlers/*.ts` | Modify | 處理 timeout 欄位 |
| `front-end/src/views/GamePage/components/TopInfoBar.vue` | Modify | 顯示操作倒數 |
| `front-end/src/views/GamePage/components/DecisionModal.vue` | Modify | 顯示決策倒數 |
| `doc/shared/protocol.md` | Modify | 更新協議規格 |

### 2.2 Files to Create

| File | Description |
|------|-------------|
| `front-end/src/user-interface/adapter/composables/useCountdown.ts` | 倒數計時 composable |
| `front-end/src/views/GamePage/components/RoundEndPanel.vue` | 回合結束面板組件 |
| `front-end/tests/adapter/composables/useCountdown.spec.ts` | Composable 測試 |
| `front-end/tests/views/countdown.spec.ts` | UI 倒數測試 |

---

## 3. Implementation Order

### Phase 1: Core Infrastructure

1. **更新事件型別** (`events.ts`)
   - 為 8 個事件新增 `action_timeout_seconds?: number`
   - 為 3 個事件新增 `display_timeout_seconds?: number`

2. **實作 useCountdown composable** (`useCountdown.ts`)
   - 封裝 setInterval 邏輯
   - 提供 start/stop/remaining 介面
   - 測試優先

3. **擴展 UIStateStore** (`uiState.ts`)
   - 新增 `actionTimeoutRemaining`, `displayTimeoutRemaining` state
   - 新增 countdown actions

### Phase 2: Event Handler Integration

4. **擴展 TriggerUIEffectPort** (`notification.port.ts`)
   - 新增 `startActionCountdown`, `stopActionCountdown`
   - 新增 `startDisplayCountdown`, `stopDisplayCountdown`

5. **更新各 Event Handler Use Cases**
   - HandleRoundDealtUseCase
   - HandleSelectionRequiredUseCase
   - HandleTurnProgressAfterSelectionUseCase
   - HandleDecisionRequiredUseCase
   - HandleRoundScoredUseCase
   - HandleRoundEndedInstantlyUseCase
   - HandleRoundDrawnUseCase
   - HandleGameSnapshotRestoreUseCase

### Phase 3: UI Components

6. **修改 TopInfoBar.vue**
   - 顯示 `actionTimeoutRemaining`
   - 低於 5 秒警示色

7. **修改 DecisionModal.vue**
   - 顯示決策倒數

8. **新增 RoundEndPanel.vue**
   - 顯示 `displayTimeoutRemaining`
   - 倒數結束自動關閉
   - 阻止提前關閉

### Phase 4: Documentation

9. **更新 protocol.md**
   - 新增欄位說明
   - 更新事件 schema

---

## 4. Quick Implementation Guide

### 4.1 useCountdown Composable

```typescript
// front-end/src/user-interface/adapter/composables/useCountdown.ts
import { ref, readonly, onUnmounted } from 'vue'

export function useCountdown() {
  const remaining = ref(0)
  let intervalId: number | null = null

  function start(seconds: number) {
    stop()
    remaining.value = seconds
    intervalId = window.setInterval(() => {
      if (remaining.value > 0) {
        remaining.value--
      } else {
        stop()
      }
    }, 1000)
  }

  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function reset() {
    stop()
    remaining.value = 0
  }

  onUnmounted(() => stop())

  return {
    remaining: readonly(remaining),
    start,
    stop,
    reset,
  }
}
```

### 4.2 UIStateStore Extension

```typescript
// 新增到 uiState.ts state
actionTimeoutRemaining: null as number | null,
displayTimeoutRemaining: null as number | null,

// 新增到 actions（需要 interval 管理）
// 可以在 store 內部使用 useCountdown 或直接管理 interval
```

### 4.3 Event Type Extension Example

```typescript
// events.ts
export interface RoundDealtEvent {
  // ... existing fields
  readonly action_timeout_seconds?: number  // NEW
}
```

### 4.4 TopInfoBar Countdown Display

```vue
<!-- TopInfoBar.vue -->
<template>
  <div class="...">
    <!-- Center: Game status -->
    <div class="flex flex-col items-center">
      <div class="text-sm font-medium" :class="{ 'text-yellow-400': isMyTurn }">
        {{ turnText }}
      </div>
      <!-- NEW: Countdown display -->
      <div
        v-if="actionTimeoutRemaining !== null"
        class="text-xl font-bold"
        :class="actionTimeoutRemaining <= 5 ? 'text-red-500' : 'text-white'"
      >
        {{ actionTimeoutRemaining }}
      </div>
      <div class="text-xs text-gray-400">
        Deck: {{ deckRemaining }}
      </div>
    </div>
  </div>
</template>
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

```typescript
// useCountdown.spec.ts
describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start countdown from given seconds', () => {
    const { remaining, start } = useCountdown()
    start(30)
    expect(remaining.value).toBe(30)
  })

  it('should decrement every second', () => {
    const { remaining, start } = useCountdown()
    start(30)
    vi.advanceTimersByTime(1000)
    expect(remaining.value).toBe(29)
  })

  it('should stop at 0', () => {
    const { remaining, start } = useCountdown()
    start(2)
    vi.advanceTimersByTime(3000)
    expect(remaining.value).toBe(0)
  })
})
```

### 5.2 Integration Tests

- 測試事件處理後 countdown 是否正確啟動
- 測試 UI 組件是否正確顯示倒數
- 測試警示色切換

---

## 6. Commands

```bash
# 執行測試
cd front-end
pnpm test:unit

# 執行特定測試
pnpm test:unit -- --run tests/adapter/composables/useCountdown.spec.ts

# 執行類型檢查
pnpm type-check

# 啟動開發伺服器
pnpm dev
```

---

## 7. Checklist

- [ ] `events.ts` - 新增 timeout 欄位到 8 個事件型別
- [ ] `useCountdown.ts` - 實作並測試 composable
- [ ] `uiState.ts` - 新增 state 和 actions
- [ ] `TriggerUIEffectPort` - 擴展介面
- [ ] Event Handler Use Cases (8 個) - 整合 timeout 處理
- [ ] `TopInfoBar.vue` - 顯示操作倒數
- [ ] `DecisionModal.vue` - 顯示決策倒數
- [ ] `RoundEndPanel.vue` - 新增回合結束面板
- [ ] `protocol.md` - 更新協議文檔
- [ ] 單元測試覆蓋
- [ ] 整合測試覆蓋
