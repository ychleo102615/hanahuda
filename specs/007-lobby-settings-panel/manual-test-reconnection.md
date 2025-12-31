# Manual Test Plan: 斷線重連流程

**Feature**: User Story 4 - 斷線重連直接回到遊戲
**Date**: 2025-12-02
**Test Type**: Manual Integration Test

---

## Test Objective

驗證使用者在遊戲中斷線並重連成功後，系統能夠：
1. 清除配對狀態（matchmakingState）
2. 恢復完整遊戲狀態
3. 跳過大廳畫面，直接回到遊戲
4. 阻止使用者誤入大廳（路由守衛）

---

## Prerequisites

- 前端應用已啟動（開發模式）
- 後端伺服器已啟動（支援 SSE 重連）
- 瀏覽器開發者工具已開啟（用於模擬斷線）

---

## Test Scenarios

### Scenario 1: 正常重連流程（跳過大廳）

**Steps:**

1. **啟動遊戲會話**
   - 從首頁點擊「Start Game」→ 進入 `/lobby`
   - 點擊「Find Match」→ 配對成功
   - 收到 `GameStarted` 事件 → 進入 `/game`
   - 驗證遊戲畫面正常顯示

2. **模擬斷線**
   - 在瀏覽器開發者工具的 Network 標籤
   - 選擇「Offline」模式
   - 或關閉 SSE 連線（Application → Service Workers → Offline）
   - 驗證畫面顯示「連線中斷，正在重連...」提示

3. **模擬重連**
   - 恢復網路連線（取消 Offline 模式）
   - 驗證 SSE 自動重連（指數退避：1s, 2s, 4s, 8s, 16s）
   - 收到 `GameSnapshotRestore` 事件

4. **驗證重連後狀態**
   - ✅ 遊戲狀態完全恢復（卡片、分數、回合狀態）
   - ✅ 顯示「連線已恢復」通知訊息
   - ✅ 操作倒數計時器恢復（若有）
   - ✅ 使用者可繼續遊戲

5. **驗證配對狀態已清除**
   - 打開 Vue DevTools → Pinia
   - 檢查 `matchmakingState` store
   - ✅ `status` 應為 `'idle'`
   - ✅ `sessionToken` 應為 `null`
   - ✅ `errorMessage` 應為 `null`

6. **驗證路由守衛**
   - 在瀏覽器網址列手動輸入 `/lobby` 並按 Enter
   - ✅ 應立即重定向至 `/game`（不顯示大廳畫面）
   - ✅ 控制台顯示警告：`[Router] 遊戲會話已存在，重定向至 /game`

**Expected Result:**
- 重連成功後直接回到遊戲畫面
- 配對狀態完全清除
- 無法進入大廳（路由守衛攔截）

---

### Scenario 2: 重連後主動離開遊戲（應允許進入大廳）

**Steps:**

1. **繼續 Scenario 1 的狀態**（重連成功，遊戲進行中）

2. **主動離開遊戲**
   - 點擊操作面板選單按鈕（右上角）
   - 點擊「Leave Game」
   - 確認對話框點擊「Confirm」

3. **驗證遊戲狀態已清除**
   - Vue DevTools → Pinia → `gameState`
   - ✅ `gameId` 應為 `null`
   - ✅ 所有遊戲資料應重置

4. **嘗試進入大廳**
   - 從首頁點擊「Start Game」
   - ✅ 應成功進入 `/lobby`（不被攔截）
   - ✅ 大廳顯示「Ready to Play?」與「Find Match」按鈕

**Expected Result:**
- 離開遊戲後，gameState 完全清除
- 可以正常進入大廳開始新遊戲

---

### Scenario 3: 配對中斷線並重連

**Steps:**

1. **啟動配對**
   - 從首頁進入 `/lobby`
   - 點擊「Find Match」
   - 驗證狀態變為 `finding`，倒數計時開始

2. **配對中模擬斷線**
   - 在配對等待期間（倒數中）
   - 關閉網路連線（Offline 模式）
   - 等待 5 秒

3. **重連**
   - 恢復網路連線
   - 若在斷線期間配對成功：
     - ✅ 收到 `GameStarted` 事件
     - ✅ 進入遊戲畫面
     - ✅ `matchmakingState` 應已清除
   - 若配對超時：
     - ✅ 收到 `GameError` 事件（`MATCHMAKING_TIMEOUT`）
     - ✅ 顯示錯誤訊息與「Retry」按鈕
     - ✅ 允許重試

**Expected Result:**
- 配對中斷線後，狀態由後端權威決定
- 前端正確處理 GameStarted 或 GameError 事件
- matchmakingState 狀態正確更新

---

### Scenario 4: 多次重連（連線不穩定）

**Steps:**

1. **第一次重連**
   - 遊戲進行中，模擬斷線
   - 重連成功，收到 `GameSnapshotRestore`
   - ✅ 遊戲狀態恢復
   - ✅ `matchmakingState` 清除

2. **第二次斷線**
   - 遊戲繼續進行 10 秒後
   - 再次模擬斷線

3. **第二次重連**
   - 重連成功，再次收到 `GameSnapshotRestore`
   - ✅ 遊戲狀態再次恢復（最新狀態）
   - ✅ `matchmakingState` 仍為清除狀態
   - ✅ 無殘留配對資料

**Expected Result:**
- 多次重連不會導致狀態混亂
- matchmakingState 每次重連都正確清除
- 遊戲狀態始終與後端同步

---

### Scenario 5: 瀏覽器重新載入後重連

**Steps:**

1. **遊戲進行中**
   - 配對成功，遊戲進行中
   - `gameState.gameId` 存在

2. **瀏覽器重新載入**
   - 按 F5 或 Cmd+R 重新載入頁面
   - （假設 sessionStorage 保留 session_token）

3. **自動重連**
   - 若實作了自動重連邏輯：
     - ✅ 自動調用 `joinGame(session_token)`
     - ✅ 收到 `GameSnapshotRestore`
     - ✅ 恢復至遊戲畫面（跳過大廳）
   - 若未實作：
     - ✅ 返回首頁或大廳
     - ✅ `gameState` 重置

**Expected Result:**
- 若支援瀏覽器重新載入後重連，流程與正常重連一致
- 若不支援，應優雅降級（返回首頁）

---

## Verification Checklist

### lobbyPageGuard 驗證

- [ ] 無遊戲會話時允許進入大廳
- [ ] 有遊戲會話時重定向至 `/game`
- [ ] 重連後嘗試進入大廳被攔截
- [ ] 離開遊戲後可正常進入大廳

### HandleReconnectionUseCase 驗證

- [ ] 收到 GameSnapshotRestore 後清除 matchmakingState
- [ ] 中斷所有進行中的動畫
- [ ] 恢復完整遊戲狀態
- [ ] 顯示「連線已恢復」訊息
- [ ] 恢復操作倒數計時

### matchmakingState 驗證

- [ ] 重連後 `status` 為 `'idle'`
- [ ] 重連後 `sessionToken` 為 `null`
- [ ] 重連後 `errorMessage` 為 `null`
- [ ] 多次重連不會殘留配對資料

### 整合流程驗證

- [ ] 正常重連流程跳過大廳
- [ ] 離開遊戲後可進入大廳
- [ ] 配對中斷線處理正確
- [ ] 多次重連不會導致狀態混亂

---

## Common Issues & Debugging

### Issue 1: 重連後未清除 matchmakingState

**Symptoms:**
- `matchmakingState.status` 殘留為 `'finding'` 或 `'error'`
- `sessionToken` 未清除

**Debug Steps:**
1. 檢查 `HandleReconnectionUseCase` 是否注入 `matchmakingStatePort`
2. 檢查 `execute()` 方法是否呼叫 `this.matchmakingState.clearSession()`
3. 檢查 DI Container 註冊是否正確

**Fix:**
- 確保 `HandleReconnectionUseCase` 在 line 38 呼叫 `clearSession()`

---

### Issue 2: lobbyPageGuard 未攔截

**Symptoms:**
- 重連後可以進入大廳
- 路由守衛未執行

**Debug Steps:**
1. 檢查 `/lobby` 路由是否設置 `beforeEnter: lobbyPageGuard`
2. 檢查 `gameState.gameId` 是否正確設置
3. 控制台查看路由守衛日誌

**Fix:**
- 確保 `router/index.ts` 正確配置 `lobbyPageGuard`

---

### Issue 3: SSE 未自動重連

**Symptoms:**
- 斷線後未收到 GameSnapshotRestore
- 連線未恢復

**Debug Steps:**
1. 檢查 `GameEventClient.reconnect()` 方法
2. 檢查指數退避邏輯
3. 檢查最大重試次數

**Fix:**
- 驗證 SSE 重連邏輯實作
- 確保 `onConnectionFailedCallback` 正確處理

---

## Test Result Template

**Test Date:** [Date]
**Tester:** [Name]
**Environment:** [Development/Staging/Production]

| Scenario | Status | Notes |
|----------|--------|-------|
| Scenario 1: 正常重連流程 | ☐ Pass ☐ Fail | |
| Scenario 2: 離開遊戲後進入大廳 | ☐ Pass ☐ Fail | |
| Scenario 3: 配對中斷線 | ☐ Pass ☐ Fail | |
| Scenario 4: 多次重連 | ☐ Pass ☐ Fail | |
| Scenario 5: 瀏覽器重新載入 | ☐ Pass ☐ Fail | |

**Overall Status:** ☐ All Pass ☐ Some Fail

**Issues Found:**
1. [Issue description]
2. [Issue description]

**Sign-off:** _________________________

---

**Document Version:** 1.0
**Last Updated:** 2025-12-02
