# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# **使用繁體中文**

# 反幻覺指示

你必須在回答前先進行「事實檢查思考」(fact-check thinking)。 除非使用者明確提供、或資料中確實存在，否則不得假設、推測或自行創造內容。

具體規則如下：

1. **嚴格依據來源**
    
    - 僅使用使用者提供的內容、你內部明確記載的知識、或經明確查證的資料。
    - 若資訊不足，請直接說明「沒有足夠資料」或「我無法確定」，不要臆測。
2. **顯示思考依據**
    
    - 若你引用資料或推論，請說明你依據的段落或理由。
    - 若是個人分析或估計，必須明確標註「這是推論」或「這是假設情境」。
3. **避免裝作知道**
    
    - 不可為了讓答案完整而「補完」不存在的內容。
    - 若遇到模糊或不完整的問題，請先回問確認或提出選項，而非自行決定。
4. **保持語意一致**
    
    - 不可改寫或擴大使用者原意。
    - 若你需要重述，應明確標示為「重述版本」，並保持語義對等。
5. **回答格式**
    
    - 若有明確資料：回答並附上依據。
    - 若無明確資料：回答「無法確定」並說明原因。
    - 不要在回答中使用「應該是」「可能是」「我猜」等模糊語氣，除非使用者要求。
6. **思考深度**
    
    - 在產出前，先檢查答案是否： a. 有清楚依據  
        b. 未超出題目範圍  
        c. 沒有出現任何未被明確提及的人名、數字、事件或假設

最終原則：**寧可空白，不可捏造。**

---

## 專案概述

這是一個日本花牌（Hanafuda）「來來」(Koi-Koi) 網頁遊戲的企劃與設計文檔倉庫。專案採用 Clean Architecture、Domain Driven Development 以及微服務預備架構設計。

**技術棧**：
- 前端：Vue 3 + TypeScript + Tailwind CSS
- 後端：Java (Spring Boot) + PostgreSQL
- 通訊：REST API + Server-Sent Events (SSE)

## 核心文檔架構

### doc/ 資料夾

這是專案的核心文檔目錄，包含三個關鍵文件：

#### 1. `doc/readme.md` - 產品需求文檔 (PRD)
**最重要的文檔**，包含完整的專案規劃與架構設計：

- **專案目標與價值**：面向國際新手玩家的日本花牌遊戲
- **MVP 功能需求**：首頁、遊戲頁面、核心遊戲邏輯
- **非功能需求**：效能、可擴展性、可維護性、安全性
- **通訊架構設計 (第 4 節)**：
  - REST + SSE 混合架構
  - 完整通訊流程圖（6 個階段）
  - SSE 容錯與重連設計（快照模式）
- **Clean Architecture 實踐 (第 5 節)**：
  - 四層架構（Domain → Application → Adapter → Framework）
  - Use Case 設計原則
  - 依賴注入配置
  - 資料格式定義（JSON DTO）
- **開發階段規劃 (第 7 節)**：7 週開發計劃，每週詳細任務列表
- **未來擴展方向**：微服務拆分、多人對戰、分散式系統

**關鍵設計原則**：
1. 伺服器權威：所有邏輯、狀態、驗證均在伺服器
2. 命令-事件模式：客戶端發送命令，伺服器推送 SSE 事件
3. 最小增量原則：僅傳遞變化數據
4. 快照恢復：斷線重連時一次性獲取完整狀態

#### 2. `doc/game-flow.md` - 前後端交互規格
**技術實作的權威規範**，定義所有命令與事件：

- **卡片 ID 編碼規則**：MMTI 格式（月份 + 牌型 + 索引）
- **常數定義**：FlowState、CardType、Decision、錯誤代碼
- **核心數據結構**：
  - `NextState`：流程狀態
  - `CardPlay`、`CardSelection`：卡片操作
  - `Yaku`、`YakuUpdate`：役型相關
  - `GameState`、`RoundState`、`CardsState`：遊戲狀態
- **客戶端命令 (C2S)**：
  - `GameRequestJoin`：加入/重連
  - `TurnPlayHandCard`：打手牌
  - `TurnSelectTarget`：選擇翻牌配對目標
  - `RoundMakeDecision`：Koi-Koi 決策
- **伺服器事件 (S2C)**：
  - 遊戲級：`GameStarted`、`RoundDealt`、`RoundScored`、`GameFinished`
  - 回合級：`TurnCompleted`、`SelectionRequired`、`DecisionRequired`、`DecisionMade`
  - 重連：`GameSnapshotRestore`
- **事件流程範例**：4 種典型場景的完整交互流程

**前後端實作必須嚴格遵循此規格**。

#### 3. `doc/rule.md` - 遊戲規則
花札基礎資料與 Koi-Koi 規則：

- **卡片列表**：48 張牌（12 個月份，每月 4 張）
- **牌面分類**：光牌（20 點）、種牌（10 點）、短冊（5 點）、カス（1 點）
- **役種列表**：
  - 光牌系（4 種）：五光、四光、雨四光、三光
  - 短冊系（3 種）：赤短、青短、短冊
  - 種牌系（4 種）：豬鹿蝶、花見酒、月見酒、種
  - かす系（1 種）：かす
  - 特殊役種：手四、月見、親權
- **計分規則**：Koi-Koi 機制、倍率計算

## 文檔修訂歷史

**當前版本**：
- `readme.md` v1.4：移除特定語言程式碼，改為語言無關的資料格式定義
- `game-flow.md`：最新版本，統一命令-事件模式

**重要修訂**（v1.3）：
- 完全對齊 `game-flow.md` 的命令-事件模式
- 引入 `FlowStage` 狀態機機制
- 採用快照模式進行斷線重連

## 架構關鍵概念

### 1. FlowStage 狀態機
遊戲流程由三個狀態驅動：
- `AWAITING_HAND_PLAY`：等待玩家打出手牌
- `AWAITING_SELECTION`：等待玩家選擇配對目標（多張可配對時）
- `AWAITING_DECISION`：等待玩家做 Koi-Koi 決策

每個 SSE 事件包含 `next_state`，指示客戶端下一步狀態。

### 2. 配對邏輯
- **手牌配對**：玩家打手牌時，若場上有多張同月份牌，需要選擇配對目標（在命令中指定 `target`）
- **牌堆配對**：翻開牌堆牌時，若場上有多張同月份牌，觸發 `SelectionRequired` 事件，玩家必須選擇

### 3. 斷線重連（快照模式）
- 客戶端保存 `session_token` 到 `localStorage`
- 重連時發送 `GameRequestJoin` + `session_token`
- 伺服器推送 `GameSnapshotRestore` 事件，包含完整遊戲狀態
- 客戶端根據 `flow_state` 恢復 UI

### 4. Clean Architecture 分層
```
Framework & Drivers (Spring MVC, PostgreSQL)
  ↓
Interface Adapters (Controllers, DTOs, Repository Impl)
  ↓
Application (Use Cases, Port Interfaces)
  ↓
Domain (Game, Card, Yaku, GameRules)
```

**依賴規則**：依賴箭頭只能由外層指向內層。Domain 層不依賴任何框架。

## MVP 實作範圍

### 後端核心功能
- **Use Cases**：
  - `JoinGameUseCase`：處理加入/重連
  - `PlayHandCardUseCase`：打手牌
  - `SelectMatchedCardUseCase`：選擇配對目標
  - `MakeKoiKoiDecisionUseCase`：Koi-Koi 決策
  - `ExecuteOpponentTurnUseCase`：對手回合
  - `DetectYakuUseCase`：役種檢測
- **役種檢測**：實作 12 種常用役種（詳見 `rule.md`）
- **對手策略**：簡易隨機策略

### 前端核心功能
- **首頁**：Hero Section、規則介紹、版權聲明
- **遊戲頁面**：
  - 固定 Viewport 設計（100vh × 100vw，無垂直滾動）
  - 五個區塊：頂部資訊列、對手已獲得牌區、場中央牌區、玩家已獲得牌區、玩家手牌區
- **SSE 整合**：監聽所有遊戲事件，更新 UI 並播放動畫
- **錯誤處理**：處理 `TurnError` 事件，自動重連（指數退避）

### REST API 端點
| 端點 | 方法 | 對應命令 | FlowStage |
|------|------|---------|-----------|
| `/api/v1/games/join` | POST | `GameRequestJoin` | N/A |
| `/api/v1/games/{gameId}/turns/play-card` | POST | `TurnPlayHandCard` | `AWAITING_HAND_PLAY` |
| `/api/v1/games/{gameId}/turns/select-match` | POST | `TurnSelectTarget` | `AWAITING_SELECTION` |
| `/api/v1/games/{gameId}/rounds/decision` | POST | `RoundMakeDecision` | `AWAITING_DECISION` |
| `/api/v1/games/{gameId}/events` | GET (SSE) | - | - |
| `/api/v1/games/{gameId}/snapshot` | GET | - | Fallback 用 |

## 開發順序建議

根據 `readme.md` 第 7 節的 7 週計劃：

1. **Week 1**：環境設定 + 基礎架構
2. **Week 2-3**：核心遊戲邏輯（Domain Layer + 單元測試）
3. **Week 3-4**：Use Case 與 API 實作
4. **Week 4-5**：SSE 整合與對手實作
5. **Week 5-6**：前端 UI/UX 實作
6. **Week 6**：整合測試與優化
7. **Week 7**：測試、部署與文檔

## 重要設計決策

### 為什麼選擇 SSE？
相較於 WebSocket：
- ✅ 滿足 Server 主動推送需求
- ✅ 實作簡單，Spring 原生支援
- ✅ 自動重連機制
- ✅ 適合單向事件流
- ✅ 未來可平滑升級到 WebSocket（多人對戰時）

### 為什麼採用快照模式重連？
相較於事件補發：
- ✅ 簡化實作：無需追蹤「哪些事件錯過」
- ✅ 一致性保證：快照包含完整狀態
- ✅ 易於測試：可用快照 Mock 數據

### 為什麼預留微服務架構？
- 展示可擴展的分散式系統設計能力
- MVP 採用單體應用，但設計上預留微服務化路徑
- 使用 UUID 作為 Game ID，避免分散式環境 ID 衝突
- 無狀態 API 設計，便於水平擴展

## 注意事項

1. **所有實作必須嚴格遵循 `game-flow.md` 的規格**
2. **前後端數據結構必須使用 JSON 格式**（遵循 `readme.md` 第 5.3 節）
3. **Domain Layer 不依賴任何框架**（Clean Architecture 原則）
4. **單元測試覆蓋率 > 80%**（特別是核心業務邏輯）
5. **API Response 使用 DTO，不直接返回 Domain Model**
6. **所有 SSE 事件包含遞增的 `event_id`**（用於檢測事件遺漏）
7. **MVP 不實作特殊役種**（手四、月見、親權在 Post-MVP）

## 修改文檔時

如果需要修改 `doc/` 目錄下的文檔：

1. **三個文件必須保持一致性**：
   - `readme.md` 定義整體架構
   - `game-flow.md` 定義技術規格
   - `rule.md` 定義遊戲規則
2. **修改後更新版本號與修訂說明**（位於 `readme.md` 頂部）
3. **確保前後端實作規格完全對齊**

## 參考資源

- **規則參考**：任天堂官方、Wikipedia、Fuda Wiki
- **圖檔資源**：Wikimedia Commons (Public Domain)、dotty-dev/Hanafuda-Louie-Recolor (CC BY-SA 4.0)
- **技術文檔**：Clean Architecture (Robert C. Martin)、DDD (Eric Evans)、Spring Boot、Vue 3、MDN SSE

## Active Technologies
- TypeScript 5.x + Vue 3.x + Vue 3, TypeScript, Tailwind CSS, Vue Router (001-homepage-implementation)
- N/A (靜態首頁，無資料持久化需求) (001-homepage-implementation)

## Recent Changes
- 001-homepage-implementation: Added TypeScript 5.x + Vue 3.x + Vue 3, TypeScript, Tailwind CSS, Vue Router
