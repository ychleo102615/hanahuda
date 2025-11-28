# Research: 事件時間倒數功能

**Feature Branch**: `006-event-countdown-timer`
**Date**: 2025-11-28

## Overview

本研究文檔解決 Technical Context 中的技術決策，並為 Phase 1 設計階段提供基礎。

---

## Research Task 1: 倒數計時實作方式

### Question

在 Vue 3 + Composition API 環境中，如何實現準確且高效能的倒數計時器？

### Decision

採用 `setInterval` + Pinia State 結合 Vue Composable 模式。

### Rationale

1. **狀態管理**：倒數剩餘秒數需要被多個組件共享（TopInfoBar、DecisionModal、RoundEndPanel），使用 Pinia 集中管理。

2. **計時器封裝**：建立 `useCountdown` composable，封裝計時邏輯：
   - 提供 `start(seconds)`, `stop()`, `reset()` 方法
   - 返回 reactive `remaining` 值
   - 自動清理（組件卸載時清除 interval）

3. **精度考量**：
   - 使用 1 秒 interval（`setInterval(fn, 1000)`）
   - 前端倒數為視覺反饋，實際邏輯由後端控制
   - ±2 秒誤差可接受（spec 已明確）

### Alternatives Considered

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| requestAnimationFrame | 精確到 ms | 過度精確、耗電、複雜度高 | **拒絕** |
| Web Worker | 背景執行 | 過度工程化、跨組件通訊複雜 | **拒絕** |
| VueUse useInterval | 現成封裝 | 需額外依賴、功能過多 | **拒絕** |
| setInterval + Pinia | 簡單、直覺、足夠精確 | - | **採用** |

### Implementation Pattern

```typescript
// useCountdown.ts (composable)
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

  onUnmounted(() => stop())

  return { remaining: readonly(remaining), start, stop }
}
```

---

## Research Task 2: 狀態管理架構

### Question

timeout 狀態應該存放在 GameStateStore 還是 UIStateStore？

### Decision

**存放在 UIStateStore**，但由 GameStateStore 傳遞初始值。

### Rationale

1. **職責分離**：
   - `GameStateStore`：管理與後端同步的遊戲狀態（牌面、分數、流程）
   - `UIStateStore`：管理前端 UI 臨時狀態（Modal、訊息、計時器）

2. **timeout 特性**：
   - 初始值來自 SSE 事件（後端）→ 屬於遊戲狀態
   - 遞減邏輯在前端執行 → 屬於 UI 狀態
   - 不參與快照恢復的精確同步（±2秒誤差可接受）

3. **設計方案**：
   - 事件處理時，從 payload 提取 `action_timeout_seconds` 或 `display_timeout_seconds`
   - 調用 UIStateStore 的 action 啟動計時器
   - UIStateStore 管理計時器 state

### State Structure

```typescript
// UIStateStoreState 新增欄位
interface UIStateStoreState {
  // ... existing fields

  // 操作倒數（回合操作、決策）
  actionTimeoutRemaining: number | null  // null = 無倒數

  // 顯示倒數（回合結束面板）
  displayTimeoutRemaining: number | null  // null = 無倒數
}
```

### Alternatives Considered

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| 全部放 GameStateStore | 集中管理 | 違反單一職責、快照恢復複雜 | **拒絕** |
| 全部放 UIStateStore | 符合 UI 職責 | - | **採用** |
| 獨立 TimerStore | 隔離徹底 | 過度拆分、增加複雜度 | **拒絕** |

---

## Research Task 3: 事件處理整合

### Question

如何在現有事件處理架構中整合 timeout 欄位處理？

### Decision

在各 Event Handler Use Case 中解析 timeout 欄位，透過現有 Port 介面更新 UI 狀態。

### Rationale

1. **現有架構**：
   - SSE 事件 → EventRouter → HandleXxxUseCase → Ports (UIStatePort, AnimationPort, etc.)
   - Use Case 是事件處理的協調者

2. **整合方式**：
   - 擴展 `TriggerUIEffectPort` 介面，新增 `startActionCountdown(seconds)` 和 `startDisplayCountdown(seconds)` 方法
   - 在 Use Case 中調用新方法

3. **受影響的 Use Cases**：

| Use Case | 新增邏輯 |
|----------|---------|
| HandleRoundDealtUseCase | 調用 `startActionCountdown(action_timeout_seconds)` |
| HandleSelectionRequiredUseCase | 調用 `startActionCountdown(action_timeout_seconds)` |
| HandleTurnProgressAfterSelectionUseCase | 調用 `startActionCountdown(action_timeout_seconds)` (若有 next_state) |
| HandleDecisionRequiredUseCase | 調用 `startActionCountdown(action_timeout_seconds)` |
| HandleRoundScoredUseCase | 調用 `startDisplayCountdown(display_timeout_seconds)` |
| HandleRoundEndedInstantlyUseCase | 調用 `startDisplayCountdown(display_timeout_seconds)` |
| HandleRoundDrawnUseCase | 調用 `startDisplayCountdown(display_timeout_seconds)` |
| HandleGameSnapshotRestoreUseCase | 調用 `startActionCountdown(action_timeout_seconds)` (若有) |

### Alternatives Considered

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| 在 EventRouter 統一處理 | 集中邏輯 | 破壞單一職責、難以測試 | **拒絕** |
| 獨立 Timeout Handler | 解耦 | 增加複雜度、重複解析 | **拒絕** |
| 在 Use Case 中處理 | 符合現有架構、易測試 | - | **採用** |

---

## Research Task 4: UI 組件設計

### Question

倒數顯示應該如何整合到現有組件？

### Decision

在現有組件中直接整合倒數顯示邏輯，使用 Pinia 狀態驅動。

### Rationale

1. **TopInfoBar.vue**：
   - 現有結構：左（對手分數）、中（回合狀態）、右（玩家分數）
   - 整合位置：中間區域，在 "Your Turn" / "Opponent's Turn" 下方
   - 顯示格式：整數秒數（如 "30"）
   - 低於 5 秒時套用 `text-red-500` 或 `text-orange-500` class

2. **DecisionModal.vue**：
   - 現有結構：標題 → 役種列表 → 分數 → 說明 → 按鈕
   - 整合位置：按鈕上方或旁邊
   - 顯示格式：與 TopInfoBar 一致

3. **回合結束面板**：
   - 現有狀態：`roundDrawnVisible` 已存在於 UIStateStore
   - 需新增：通用回合結束面板組件（或擴展現有機制）
   - 整合位置：面板底部
   - 顯示格式："Next round in: X s" 或 "下一回合：X 秒"

### Alternatives Considered

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| 獨立 CountdownDisplay 組件 | 可複用 | 過度抽象、props 傳遞複雜 | **拒絕** |
| 直接在各組件整合 | 簡單、直覺 | - | **採用** |

---

## Research Task 5: 協議擴展方式

### Question

如何安全地擴展現有事件型別定義？

### Decision

在 TypeScript 型別定義中新增 optional 欄位，確保向後兼容。

### Rationale

1. **向後兼容**：欄位設為 optional，舊版後端（無此欄位）不會導致前端錯誤
2. **型別安全**：TypeScript 編譯時檢查
3. **漸進式採用**：前端可先實作，後端稍後補上

### Implementation

```typescript
// events.ts 修改
export interface RoundDealtEvent {
  // ... existing fields
  readonly action_timeout_seconds?: number  // 新增 (optional)
}

export interface SelectionRequiredEvent {
  // ... existing fields
  readonly action_timeout_seconds?: number  // 新增 (optional)
}

// ... 其他事件類似

export interface RoundScoredEvent {
  // ... existing fields
  readonly display_timeout_seconds?: number  // 新增 (optional)
}

export interface GameSnapshotRestore {
  // ... existing fields
  readonly action_timeout_seconds?: number  // 新增 (optional)
}
```

---

## Research Task 6: 視覺設計 - 警示色

### Question

低於 5 秒時應使用什麼警示色？

### Decision

使用 Tailwind CSS 的 `text-red-500` 作為警示色。

### Rationale

1. **一致性**：專案已使用 Tailwind CSS
2. **可辨識性**：紅色在深色背景（`bg-gray-800`）上對比度高
3. **語意**：紅色普遍代表緊急/警告

### Implementation

```vue
<span
  :class="[
    'text-xl font-bold',
    remaining <= 5 ? 'text-red-500' : 'text-white'
  ]"
>
  {{ remaining }}
</span>
```

---

## Research Task 7: 回合結束面板互動限制

### Question

如何確保回合結束面板不允許提前關閉？

### Decision

移除面板上的關閉按鈕，僅在倒數結束後自動關閉。

### Rationale

1. **需求**：spec 明確指出「不允許跳過，必須等待倒數結束」
2. **實作**：
   - 不渲染「關閉」或「跳過」按鈕
   - 使用 `watch` 監聽 `displayTimeoutRemaining`，當為 0 時自動觸發關閉
   - 攔截 ESC 鍵和背景點擊事件

### Implementation

```vue
<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    @click.stop  <!-- 阻止背景點擊 -->
    @keydown.esc.prevent  <!-- 攔截 ESC -->
  >
    <!-- 面板內容，無關閉按鈕 -->
    <div class="...">
      <!-- ... -->
      <p class="text-center">Next round in: {{ displayTimeoutRemaining }} s</p>
    </div>
  </div>
</template>

<script setup>
watch(displayTimeoutRemaining, (val) => {
  if (val === 0) {
    // 自動關閉並進入下一回合
    hideRoundEndPanel()
    // 觸發下一回合邏輯（若需要）
  }
})
</script>
```

---

## Summary

### Key Decisions

| 項目 | 決策 |
|------|------|
| 計時器實作 | setInterval + Pinia State + Vue Composable |
| 狀態位置 | UIStateStore（新增 `actionTimeoutRemaining`, `displayTimeoutRemaining`） |
| 事件整合 | 在各 HandleXxxUseCase 中處理，透過 TriggerUIEffectPort |
| UI 整合 | 直接修改現有組件（TopInfoBar, DecisionModal），新增回合結束面板 |
| 協議擴展 | Optional 欄位（向後兼容） |
| 警示色 | `text-red-500`（Tailwind CSS） |
| 面板互動 | 無關閉按鈕，倒數結束自動關閉 |

### Resolved Unknowns

所有 Technical Context 中的 NEEDS CLARIFICATION 已解決：
- 計時器精度：1 秒 interval，±2 秒誤差可接受
- 狀態管理：UIStateStore
- 組件整合：直接修改現有組件
- 協議變更：向後兼容的 optional 欄位
