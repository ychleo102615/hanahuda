# Research: UI Animation Refactor

**Feature**: 005-ui-animation-refactor
**Date**: 2025-11-21
**Status**: Complete

本文檔記錄 Phase 0 研究階段的所有技術決策、替代方案評估和最佳實踐研究。

---

## Research Tasks

### 1. Output Ports 重構方案

**Research Question**: 如何重構 TriggerUIEffectPort 以實現更清晰的職責分離？

**Decision**: 拆分為三個獨立的 Port：GameStatePort、AnimationPort、NotificationPort

**Rationale**:
- **職責分離**：動畫系統複雜度高，需要獨立管理（位置追蹤、佇列、中斷）
- **可 await 動畫**：AnimationPort 返回 Promise，Use Case 可等待動畫完成後再更新狀態
- **更好封裝**：AnimationPort 內部處理 ZoneRegistry，不暴露實作細節
- **漸進遷移**：原有 TriggerUIEffectPort 可標記 @deprecated，逐步遷移

**Alternatives Considered**:
1. **保持現有單一 Port**: 職責混雜，難以維護和測試
2. **合併為單一 UIPort**: 職責過大，違反單一職責原則
3. **只拆分動畫**: 通知邏輯仍混在狀態 Port 中，不夠清晰

**Port 職責劃分**:
```
GameStatePort     - 純數據狀態（同步）
AnimationPort     - 動畫效果（異步，可 await）
NotificationPort  - 通知/Modal/Toast（同步觸發）
```

**Use Case 整合模式**:
```typescript
// 先動畫，後狀態
async execute(event) {
  await this.animation.playMatchAnimation(...)
  this.gameState.updateFieldCards(...)
}
```

---

### 2. ZoneRegistry 位置追蹤機制

**Research Question**: 如何實作區域位置註冊和動態追蹤？

**Decision**: 使用 ResizeObserver + getBoundingClientRect 實作 ZoneRegistry

**Rationale**:
- ResizeObserver 是現代瀏覽器標準 API，可監聽元素尺寸變化
- getBoundingClientRect 提供準確的螢幕座標（包含 scroll offset）
- 組件掛載時自動註冊，卸載時自動移除
- 支援視窗 resize 時自動更新

**Alternatives Considered**:
1. **MutationObserver**: 監聽 DOM 變化，但無法監測尺寸變化
2. **window.resize 事件**: 只能監聽視窗變化，無法監測個別元素
3. **定時輪詢**: 效能差，不適合動畫系統

**Implementation Pattern**:
```typescript
// ZoneRegistry 核心 API
interface ZoneRegistry {
  register(zoneName: string, element: HTMLElement): void
  unregister(zoneName: string): void
  getPosition(zoneName: string): ZonePosition | null
  getCardPosition(zoneName: string, cardIndex: number): Position
}
```

---

### 2. @vueuse/motion 動畫最佳實踐

**Research Question**: 如何使用 @vueuse/motion 實現流暢的卡片移動動畫？

**Decision**: 使用 Spring Animation + Absolute Positioning

**Rationale**:
- Spring Animation 提供自然的物理動畫效果
- Absolute Positioning 允許卡片在任意位置間移動
- @vueuse/motion 的 `useMotion` hook 支援動態更新目標位置

**Best Practices**:
1. **使用 transform** 而非 top/left（GPU 加速）
2. **配置適當的 spring 參數**:
   - stiffness: 200-300（剛度，影響彈性）
   - damping: 15-25（阻尼，影響震盪）
   - mass: 0.5-1（質量，影響慣性）
3. **避免同時動畫過多元素**（每批次 4-8 張卡）

**Animation Flow**:
```
1. 計算起點/終點螢幕座標（從 ZoneRegistry）
2. 創建 overlay 元素（fixed position）
3. 執行 spring 動畫移動
4. 動畫完成後移除 overlay，更新實際 DOM
```

---

### 3. 拖曳互動實作方案

**Research Question**: 如何實作手牌拖曳配對功能？

**Decision**: 使用 HTML5 Drag and Drop API + 自訂拖曳圖像

**Rationale**:
- HTML5 DnD API 是標準 API，無需額外依賴
- 支援觸控設備（需要 polyfill）
- 可自訂拖曳時的視覺效果（ghost image）

**Alternatives Considered**:
1. **@vueuse/useDraggable**: 更簡潔但不支援 drop targets
2. **第三方庫（vue-draggable）**: 過重，功能超出需求
3. **純 pointer events**: 需要自行處理所有邏輯

**Implementation Pattern**:
```typescript
// CardComponent 拖曳 props
interface DragProps {
  draggable: boolean
  onDragStart: (cardId: string) => void
  onDragEnd: () => void
}

// FieldZone drop target
interface DropTarget {
  onDragOver: (event: DragEvent) => void
  onDrop: (cardId: string) => void
}
```

**Visual Effects**:
- 拖曳中: opacity 0.8, scale 1.1
- 可放置目標: 邊框高亮（border glow）
- 無效區域: cursor: not-allowed

---

### 4. 獲得區分組排列

**Research Question**: 如何實作獲得區按卡片類型分組？

**Decision**: 使用 Computed Properties + CSS Grid

**Rationale**:
- Computed property 自動根據 depository 狀態分組
- CSS Grid 提供靈活的佈局控制
- 每個分組獨立渲染，便於動畫控制

**Data Flow**:
```
gameState.myDepository (string[])
    ↓ computed
groupedDepository: {
  BRIGHT: Card[],
  ANIMAL: Card[],
  RIBBON: Card[],
  PLAIN: Card[]
}
    ↓ render
四個獨立的 CardGroup 組件
```

**Layout Design**:
```
┌─────────────────────────────────────┐
│ 光牌  │ 種牌  │ 短冊  │  かす      │
│ (5)   │ (9)   │ (10)  │  (24)     │
│ □ □   │ □ □ □ │ □ □ □ │ □ □ □ □   │
└─────────────────────────────────────┘
```

---

### 5. 動畫與狀態同步

**Research Question**: 如何處理動畫進行中的狀態變更？

**Decision**: 使用 AnimationQueue 阻塞 + Interrupt 機制

**Rationale**:
- AnimationQueue 確保動畫依序執行
- UI 操作在動畫進行中被 disable
- 狀態同步（如重連）可 interrupt 所有動畫

**State Management**:
```typescript
// UIStateStore 新增
interface AnimationState {
  isAnimating: boolean      // 阻止用戶操作
  canInterrupt: boolean     // 是否可中斷
  currentAnimation: string | null
}
```

**Sync Scenarios**:
1. **正常流程**: 動畫完成 → 更新狀態 → 允許操作
2. **重連恢復**: interrupt() → 直接設定最終狀態 → 允許操作
3. **快速操作**: 等待前一動畫完成 → 執行下一動畫

---

### 6. 牌堆視圖設計

**Research Question**: 牌堆應如何視覺呈現？

**Decision**: 堆疊卡片效果 + 數字顯示

**Rationale**:
- 視覺上模擬實體牌堆
- 清楚顯示剩餘張數
- 作為發牌動畫的視覺起點

**Design Spec**:
```
┌─────────┐
│  ┌───┐  │
│  │ 牌 │  │
│  │ 背 │  │  ← 3-4 層堆疊偏移 (2px each)
│  └───┘  │
│   24    │  ← 剩餘張數
└─────────┘
```

**Visual States**:
- 滿 (24張): 完整堆疊
- 中等 (8-23張): 減少堆疊層數
- 少 (1-7張): 單張 + 數字
- 空 (0張): 空白佔位 + "0"

---

### 7. 配對動畫流程

**Research Question**: 配對成功時的動畫順序為何？

**Decision**: 三階段動畫流程

**Rationale**:
- 符合 spec 要求：先合併再移動
- 視覺上清晰表達配對關係
- 支援拖曳和點擊兩種配對方式

**Animation Sequence**:
```
Stage 1: 手牌移動至場牌
  - 點擊: 從手牌區原位 → 場牌區配對目標
  - 拖曳: 從放開位置 → 場牌區配對目標
  Duration: 200ms

Stage 2: 合併效果
  - 兩張牌疊放
  - 輕微縮放 + 發光
  Duration: 150ms

Stage 3: 移動至獲得區
  - 從場牌區 → 獲得區對應分組
  - 兩張牌一起移動
  Duration: 300ms

Total: ~650ms (含 delay)
```

---

### 8. 發牌動畫實作

**Research Question**: 如何實現發牌動畫的時序控制？

**Decision**: Staggered Animation + Promise Chain

**Rationale**:
- 依序發牌，每張間隔 100ms
- 使用 Promise chain 確保時序正確
- 總時間控制在 2 秒內（16 張牌）

**Timing Calculation**:
```
16 cards × 100ms delay = 1500ms stagger
+ 300ms duration = 1800ms total
```

**Animation Order**:
```
1-8:  牌堆 → 場牌 (8 張)
9-16: 牌堆 → 玩家手牌 (8 張)
對手手牌不播放動畫（牌面朝下，直接出現）
```

---

## Performance Considerations

### FPS 目標
- **目標**: 60fps（16.67ms per frame）
- **降級**: 50fps（20ms per frame）
- **測量工具**: Chrome DevTools Performance

### Optimization Strategies
1. **減少 DOM 操作**: 使用 transform 而非 position
2. **批次處理**: 動畫完成後一次更新狀態
3. **限制同時動畫數**: 最多 8 個元素同時動畫
4. **使用 will-change**: 提示瀏覽器優化

### Memory Management
- 動畫完成後清理 overlay 元素
- 移除不再需要的 ResizeObserver
- 避免累積未完成的 Promise

---

## Dependencies Summary

### 現有依賴（保留）
- Vue 3.5
- @vueuse/motion（已在 CardComponent 使用）
- Pinia

### 新增依賴
- 無（使用標準 Web APIs）

### 標準 Web APIs
- ResizeObserver
- getBoundingClientRect
- HTML5 Drag and Drop
- crypto.randomUUID

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 動畫效能不佳 | Medium | High | 使用 transform + GPU 加速，設定效能基準 |
| 拖曳觸控支援 | Low | Medium | 標記為 Out of Scope，未來迭代 |
| ZoneRegistry 位置計算誤差 | Low | Medium | 使用 getBoundingClientRect，考慮 scroll |
| 動畫中斷狀態不一致 | Medium | High | 完整的 interrupt 機制測試 |

---

## Conclusion

所有技術決策已確定，無 NEEDS CLARIFICATION 項目。可進入 Phase 1 設計階段。
