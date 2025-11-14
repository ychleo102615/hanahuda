# Input Ports Contract

**Feature**: 003-ui-application-layer
**Date**: 2025-11-14
**Purpose**: 定義 Application Layer 提供的 Input Ports 介面規範，供 Adapter Layer 呼叫

## 概述

Input Ports 由 Application Layer 定義並實作（作為 Use Cases），供 Adapter Layer 呼叫。每個 Port 對應一個特定的業務流程或事件處理。

**總數**: 18 個（3 玩家操作 + 15 事件處理）

---

## 玩家操作 Ports（3 個）

### 1. PlayHandCardPort

**職責**: 處理玩家打出手牌的操作

**介面定義**:
```typescript
export interface PlayHandCardPort {
  execute(input: PlayHandCardInput): PlayHandCardOutput
}
```

**輸入參數**:
```typescript
interface PlayHandCardInput {
  cardId: string           // 要打出的手牌 ID（4 位數字字串，如 "0341"）
  handCards: string[]      // 當前手牌列表
  fieldCards: string[]     // 當前場牌列表
}
```

**輸出結果**:
```typescript
type PlayHandCardOutput = Result<{
  needSelection: boolean         // 是否需要玩家選擇配對目標
  possibleTargets?: string[]     // 可選目標列表（當 needSelection 為 true）
  selectedTarget?: string | null // 選中的目標（當 needSelection 為 false）
}>
```

**Result 型別**:
```typescript
type Result<T> =
  | { success: true; value: T }
  | { success: false; error: string }
```

**行為規範**:
1. **預驗證**: 調用 Domain Layer 驗證 `cardId` 是否在 `handCards` 中
   - 若驗證失敗，返回 `{ success: false, error: 'CARD_NOT_IN_HAND' }`
2. **配對檢查**: 調用 Domain Layer 的 `findMatchableCards()` 找出可配對的場牌
3. **多重配對處理**:
   - 若可配對場牌數量 > 1，設定 `needSelection = true`，並觸發選擇 UI（通過 TriggerUIEffectPort）
   - 返回 `{ success: true, value: { needSelection: true, possibleTargets: [...] } }`
4. **單一配對處理**:
   - 若可配對場牌數量 = 1，設定 `needSelection = false`
   - 調用 SendCommandPort 發送 `playHandCard(cardId, target)` 命令
   - 返回 `{ success: true, value: { needSelection: false, selectedTarget: '...' } }`
5. **無配對處理**:
   - 若可配對場牌數量 = 0，調用 SendCommandPort 發送 `playHandCard(cardId)` 命令（無 target）
   - 返回 `{ success: true, value: { needSelection: false, selectedTarget: null } }`

**錯誤處理**:
- `CARD_NOT_IN_HAND`: 卡片不在手牌中（預驗證失敗）
- Promise rejection（由 SendCommandPort 拋出）會被捕獲並記錄，但不影響返回值

**測試要求**:
- ✅ 驗證多重配對時觸發選擇 UI
- ✅ 驗證單一配對時直接發送命令
- ✅ 驗證無配對時發送無 target 命令
- ✅ 驗證預驗證失敗時返回錯誤

---

### 2. SelectMatchTargetPort

**職責**: 處理玩家選擇配對目標的操作

**介面定義**:
```typescript
export interface SelectMatchTargetPort {
  execute(input: SelectMatchTargetInput): SelectMatchTargetOutput
}
```

**輸入參數**:
```typescript
interface SelectMatchTargetInput {
  sourceCardId: string        // 來源卡片 ID（玩家打出的手牌或翻出的牌）
  targetCardId: string        // 玩家選擇的目標卡片 ID
  possibleTargets: string[]   // 可選目標列表（由 PlayHandCardUseCase 或事件提供）
}
```

**輸出結果**:
```typescript
type SelectMatchTargetOutput = Result<{
  valid: boolean
}>
```

**行為規範**:
1. **驗證選擇**: 調用 Domain Layer 的 `validateTargetInList()` 驗證 `targetCardId` 是否在 `possibleTargets` 中
   - 若驗證失敗，返回 `{ success: false, error: 'INVALID_TARGET_SELECTION' }`
2. **發送命令**: 調用 SendCommandPort 發送 `selectTarget(sourceCardId, targetCardId)` 命令
3. **返回結果**: 返回 `{ success: true, value: { valid: true } }`

**錯誤處理**:
- `INVALID_TARGET_SELECTION`: 選擇的目標不在可選列表中

**測試要求**:
- ✅ 驗證合法選擇時成功發送命令
- ✅ 驗證非法選擇時返回錯誤

---

### 3. MakeKoiKoiDecisionPort

**職責**: 處理玩家做出 Koi-Koi 決策的操作

**介面定義**:
```typescript
export interface MakeKoiKoiDecisionPort {
  execute(input: MakeKoiKoiDecisionInput): MakeKoiKoiDecisionOutput
}
```

**輸入參數**:
```typescript
interface MakeKoiKoiDecisionInput {
  currentYaku: YakuScore[]      // 當前役種列表（來自 DecisionRequiredEvent）
  depositoryCards: string[]     // 獲得區卡片
  koiKoiMultiplier: number      // 當前 Koi-Koi 倍率
  decision: 'KOI_KOI' | 'END_ROUND'
}

interface YakuScore {
  yaku_type: string
  base_points: number
}
```

**輸出結果**:
```typescript
type MakeKoiKoiDecisionOutput = Result<{
  decision: 'KOI_KOI' | 'END_ROUND'
  currentScore: number          // 當前分數
  potentialScore?: number       // 潛在分數（選擇繼續時，可選）
}>
```

**行為規範**:
1. **計算當前分數**: 調用 Domain Layer 的 `calculateYakuProgress()` 計算當前役種得分
2. **計算潛在分數**（可選）: 若選擇 `KOI_KOI`，可計算潛在分數（未來功能，MVP 可跳過）
3. **發送命令**: 調用 SendCommandPort 發送 `makeDecision(decision)` 命令
4. **返回結果**: 返回 `{ success: true, value: { decision, currentScore, potentialScore } }`

**測試要求**:
- ✅ 驗證選擇 `KOI_KOI` 時成功發送命令
- ✅ 驗證選擇 `END_ROUND` 時成功發送命令
- ✅ 驗證分數計算正確

---

## 事件處理 Ports（15 個）

所有事件處理 Ports 遵循相同的介面模式：

```typescript
export interface Handle{Event}Port {
  execute(event: {Event}Event): void
}
```

### 4. HandleGameStartedPort

**輸入**: `GameStartedEvent`

**行為**:
1. 解析 `players`、`ruleset`、`starting_player_id`
2. 調用 UpdateUIStatePort 初始化遊戲上下文
3. 調用 TriggerUIEffectPort 顯示「遊戲開始」訊息

**測試**: 驗證 UI 狀態初始化正確

---

### 5. HandleRoundDealtPort

**輸入**: `RoundDealtEvent`

**行為**:
1. 調用 TriggerUIEffectPort 觸發 `DEAL_CARDS` 動畫
2. 調用 UpdateUIStatePort 更新場牌、手牌、牌堆剩餘數量
3. 調用 UpdateUIStatePort 設定 FlowStage（根據 `next_state.state_type`）

**測試**: 驗證動畫觸發和狀態更新順序正確

---

### 6. HandleTurnCompletedPort

**輸入**: `TurnCompletedEvent`

**行為**:
1. 解析 `hand_card_play` 和 `draw_card_play`
2. 調用 TriggerUIEffectPort 觸發 `CARD_MOVE` 動畫
3. 調用 UpdateUIStatePort 更新場牌、手牌、獲得區
4. 調用 UpdateUIStatePort 更新牌堆剩餘數量
5. 調用 UpdateUIStatePort 設定 FlowStage

**測試**: 驗證卡片移動邏輯正確

---

### 7. HandleSelectionRequiredPort

**輸入**: `SelectionRequiredEvent`

**行為**:
1. 解析 `hand_card_play` 和 `possible_targets`
2. 調用 TriggerUIEffectPort 觸發手牌移動動畫
3. 調用 UpdateUIStatePort 更新手牌狀態
4. 調用 TriggerUIEffectPort 顯示選擇 UI 並高亮 `possible_targets`
5. 調用 UpdateUIStatePort 設定 FlowStage 為 `AWAITING_SELECTION`

**測試**: 驗證選擇 UI 顯示正確

---

### 8. HandleTurnProgressAfterSelectionPort

**輸入**: `TurnProgressAfterSelectionEvent`

**行為**:
1. 解析 `selection` 和 `draw_card_play`
2. 調用 TriggerUIEffectPort 觸發 `CARD_MOVE` 動畫
3. 調用 UpdateUIStatePort 更新場牌、獲得區
4. 若 `yaku_update` 非 null：
   - 調用 Domain Layer 驗證役種
   - 調用 TriggerUIEffectPort 觸發 `YAKU_EFFECT` 動畫
5. 調用 UpdateUIStatePort 設定 FlowStage

**測試**: 驗證役種形成時特效觸發正確

---

### 9. HandleDecisionRequiredPort

**輸入**: `DecisionRequiredEvent`

**行為**:
1. 解析 `hand_card_play`、`draw_card_play`、`yaku_update`
2. 調用 TriggerUIEffectPort 觸發卡片移動動畫
3. 調用 UpdateUIStatePort 更新場牌、手牌、獲得區
4. 調用 Domain Layer 計算當前役種與得分
5. 調用 TriggerUIEffectPort 顯示決策 Modal（包含當前役種、分數）
6. 調用 UpdateUIStatePort 設定 FlowStage 為 `AWAITING_DECISION`

**測試**: 驗證決策 Modal 內容正確

---

### 10. HandleDecisionMadePort

**輸入**: `DecisionMadeEvent`

**行為**:
1. 解析 `decision` 和 `updated_multipliers`
2. 調用 UpdateUIStatePort 更新 Koi-Koi 倍率
3. 調用 TriggerUIEffectPort 顯示「繼續遊戲」訊息（若 decision 為 `KOI_KOI`）
4. 調用 UpdateUIStatePort 設定 FlowStage（根據 `next_state.state_type`）

**測試**: 驗證倍率更新正確

---

### 11. HandleRoundScoredPort

**輸入**: `RoundScoredEvent`

**行為**:
1. 解析 `winner_id`、`yaku_list`、`final_score`、`multipliers`
2. 調用 Domain Layer 驗證分數計算（可選）
3. 調用 TriggerUIEffectPort 觸發 `SCORE_UPDATE` 動畫
4. 調用 UpdateUIStatePort 更新累計分數
5. 調用 TriggerUIEffectPort 顯示局結算畫面

**測試**: 驗證分數更新和結算畫面顯示正確

---

### 12. HandleRoundDrawnPort

**輸入**: `RoundDrawnEvent`

**行為**:
1. 調用 TriggerUIEffectPort 顯示「本局平局」訊息
2. 顯示當前累計分數（無變化）

**測試**: 驗證平局訊息顯示正確

---

### 13. HandleRoundEndedInstantlyPort

**輸入**: `RoundEndedInstantlyEvent`

**行為**:
1. 解析 `reason`（`TESHI` / `FIELD_KUTTSUKI`）
2. 若為 Teshi，顯示勝者與獲得分數
3. 調用 UpdateUIStatePort 更新累計分數
4. 調用 TriggerUIEffectPort 顯示特殊結束訊息

**測試**: 驗證不同結束原因的訊息正確

---

### 14. HandleGameFinishedPort

**輸入**: `GameFinishedEvent`

**行為**:
1. 解析 `winner_id` 和 `final_scores`
2. 調用 TriggerUIEffectPort 顯示遊戲結束畫面
3. 提供「重新開始」與「返回首頁」選項

**測試**: 驗證遊戲結束畫面顯示正確

---

### 15. HandleTurnErrorPort

**輸入**: `TurnErrorEvent`

**行為**:
1. 解析 `error_code` 和 `error_message`
2. 映射 `error_code` 為友善錯誤訊息（使用 ERROR_MESSAGES 常數）
3. 調用 TriggerUIEffectPort 顯示錯誤提示
4. 記錄錯誤日誌（console.error）
5. 根據 `retry_allowed` 決定是否允許重試

**錯誤訊息映射**:
```typescript
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_CARD: '該卡片不在您的手牌中',
  INVALID_TARGET: '無效的配對目標',
  WRONG_PLAYER: '還沒輪到您的回合',
  INVALID_STATE: '當前無法執行此操作',
  INVALID_SELECTION: '選擇的配對目標不合法'
}
```

**測試**: 驗證不同錯誤碼的訊息映射正確

---

### 16. HandleReconnectionPort

**輸入**: `GameSnapshotRestore`

**行為**:
1. 解析完整快照數據
2. 調用 UpdateUIStatePort 恢復遊戲上下文（`game_id`、`players`、`ruleset`）
3. 調用 UpdateUIStatePort 恢復牌面狀態（`field_cards`、`player_hands`、`player_depositories`）
4. 調用 UpdateUIStatePort 恢復流程控制（`current_flow_stage`、`active_player_id`）
5. 調用 UpdateUIStatePort 恢復分數與倍率（`player_scores`、`koi_statuses`）
6. 根據 `current_flow_stage` 渲染對應 UI
7. 調用 TriggerUIEffectPort 顯示「連線已恢復」訊息

**測試**: 驗證快照恢復後狀態完整

---

## 實作檢查清單

所有 Input Ports 的實作必須滿足以下條件：

- [ ] 實作對應的 Port 介面
- [ ] 遵循定義的輸入/輸出規範
- [ ] 正確調用 Domain Layer 和 Output Ports
- [ ] 完整的錯誤處理
- [ ] 單元測試覆蓋率 > 80%
- [ ] 測試包含所有邊界情況

---

## 版本歷史

- **1.0.0** (2025-11-14): 初始版本，定義 18 個 Input Ports
