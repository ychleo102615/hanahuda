# 日本花牌(Hanafuda Koi-Koi)遊戲企劃書 (PRD)

**版本**: 1.4
**最後更新**: 2025-10-20
**通訊方案**: REST + SSE (Server-Sent Events) + 命令-事件模式
**修訂說明**:
- v1.4: **移除特定語言程式碼，改為語言無關的資料格式定義**
  - 移除所有 TypeScript/Java/JavaScript/CSS 可執行程式碼
  - 保留設計要點與架構說明（以文字描述呈現）
  - 移除前端架構設計（Vue、Pinia 等特定技術選型）
  - 將 FlowStage enum 改為表格形式定義
  - 將所有 DTO 定義改為 JSON 格式範例
  - 第 2.1.2 節：CSS 代碼改為響應式設計要點說明
  - 第 2.1.3 節：從具體實作改為功能需求描述
  - 第 4.3.2 節：GameSnapshotRestore 改為 JSON 範例
  - 第 4.3.3 節：移除 TypeScript 程式碼，改為實作要點說明
  - 第 5.3 節：所有 Java DTO 改為 JSON 格式，移除 Domain Model 和 Mapper 範例
  - **符合 PRD 文件原則**：不包含可執行代碼，僅定義資料格式與功能需求
- v1.3: **統一前後端交互規格**
  - 完全對齊 game-flow.md 的命令-事件模式
  - 重新定義所有 REST API 端點（映射至 game-flow.md 命令）
  - 統一所有 SSE 事件命名（採用 `Turn*`, `Round*`, `Game*` 命名）
  - 引入 `FlowStage` 狀態機機制（`AWAITING_HAND_PLAY`, `AWAITING_SELECTION`, `AWAITING_DECISION`）
  - 採用核心資料結構（`Card`, `YakuScore`, `CardCapture`）
  - 修改斷線重連為快照模式（`GameSnapshotRestore`）
  - 更新第 4.2 節：完整通訊流程圖（涵蓋 6 個階段）
- v1.2: 術語調整(opponent/YAKU/行動)、API 配對邏輯修正、簡化 SSE 事件說明、移除資料庫設計與範例程式碼
- v1.1: 修正重大問題(架構矛盾、牌數錯誤、SSE 機制、事件順序、架構實踐)

---

## 目錄

1. [專案概述](#1-專案概述)
2. [MVP 功能需求](#2-mvp-功能需求)
3. [非功能需求](#3-非功能需求)
4. [通訊架構設計](#4-通訊架構設計)
5. [Clean Architecture 實踐指南](#5-clean-architecture-實踐指南)
6. [使用者體驗設計](#6-使用者體驗設計)
7. [開發階段規劃](#7-開發階段規劃)
8. [風險與挑戰](#8-風險與挑戰)
9. [成功指標](#9-成功指標)
10. [未來擴展方向](#10-未來擴展方向)
11. [附錄](#11-附錄)

---

## 1. 專案概述

### 1.1 專案名稱
**Hanafuda Koi-Koi Web Game**(暫定)

### 1.2 專案目標
開發一款面向國際新手玩家的日本花牌網頁遊戲,採用現代化技術架構,展示 Clean Architecture、微服務、分散式系統設計能力。

### 1.3 核心價值主張
- **新手友善**:清晰的規則說明與視覺引導
- **文化體驗**:透過遊戲了解日本傳統花牌文化
- **技術展示**:完整的前後端分離架構,展示可擴展的分散式系統設計

### 1.4 技術棧
- **前端**:Vue 3 + TypeScript + Tailwind CSS
- **後端**:Java (Spring Boot) + PostgreSQL
- **通訊**:REST API + Server-Sent Events (SSE)
- **架構**: **CRITICAL** Clean Architecture + Domain Driven Development + Microservices-ready design

---

## 2. MVP 功能需求

### 2.1 前端功能

#### 2.1.1 首頁 (Home Page)

**Hero Section**
- 遊戲標題與副標題
- 主要 CTA 按鈕:「開始遊戲」(Start Game)
- 視覺設計:傳統花牌意象融合現代設計風格

**規則介紹區 (Rules Section)**
- Koi-Koi 基本規則說明
  - 遊戲目標
  - 牌組構成(12個月份,每月4張,共48張)
  - 牌的分類(光札/Hikari、種札/Tane、短冊/Tanzaku、カス/Kasu)
  - 基本役種介紹(至少包含:五光、四光、赤短、青短、三光、花見酒、月見酒等常見役種)
  - 遊戲流程說明
- 語言:英文為主
- 可折疊/展開的詳細說明

**美術資源版權聲明區**
- 使用的花牌圖像來源聲明
- 開源授權資訊(如 MIT License, Public Domain)
- 第三方資源 attribution

**導航列**
- Logo / 遊戲名稱
- 導航連結:「規則」(Rules)、「關於」(About)、「開始遊戲」(Start Game)

---

#### 2.1.2 遊戲頁面 (Game Page)

**遊戲介面佈局 - 固定 Viewport 設計**

整個遊戲介面固定在 `100vh` × `100vw`,不會出現垂直滾動。

```
┌─────────────────────────────────────────────────────────┐
│ 頂部資訊列 (高度: ~10-12% viewport)                        │
│                                                           │
│ [對手分數: 0] [第3月] [玩家分數: 0] [玩家回合]              │
│ [新遊戲] [放棄] [規則] [遊戲記錄]                          │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ 對手已獲得牌區 (高度: ~15% viewport, 橫向滾動)             │
│ ▢ ▢ ▢ ▢ ▢ ▢                                            │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ 場中央牌區 (高度: ~30% viewport, 核心區域)                  │
│                                                           │
│              ▢ ▢ ▢ ▢                                     │
│              ▢ ▢ ▢ ▢                                     │
│                                                           │
│ (8張牌,2行4列固定網格排列)                                 │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ 玩家已獲得牌區 (高度: ~15% viewport, 橫向滾動)              │
│ ▢ ▢ ▢ ▢ ▢ ▢                                            │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ 玩家手牌區 (高度: ~25% viewport, 橫向排列)                  │
│ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢                                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**各區塊詳細說明**

1. **頂部資訊列** (~10-12% viewport 高度)
   - **第一行**:遊戲狀態資訊
     - 對手分數顯示
     - 當前月份指示器(第 X 月)
     - 玩家分數顯示
     - 回合指示器(「玩家回合」或「對手回合」)
   - **第二行**:操作按鈕
     - [新遊戲] - 開始新的一局
     - [放棄] - 放棄當前遊戲
     - [規則] - 顯示規則說明 Modal
     - [遊戲記錄] - 顯示當前遊戲的出牌記錄
   - 響應式設計:小螢幕可能需要折疊為 hamburger menu

2. **對手已獲得牌區** (~15% viewport 高度)
   - 顯示對手已收集的牌
   - 牌以縮小版本橫向排列
   - 若牌數超過可視範圍,允許橫向滾動
   - 依牌型分類顯示(光札、種札、短冊、カス)

3. **場中央牌區** (~30% viewport 高度,核心互動區域)
   - 固定顯示 8 張牌
   - 採用 2 行 × 4 列網格布局
   - 牌的尺寸依此區域自適應調整
   - 當玩家選擇手牌後,相同月份的場牌會 highlight
   - 配對成功時有動畫效果

4. **玩家已獲得牌區** (~15% viewport 高度)
   - 與對手已獲得牌區對稱設計
   - 顯示玩家已收集的牌
   - 橫向滾動
   - 成立役種時相關牌會有特殊標記

5. **玩家手牌區** (~25% viewport 高度)
   - 顯示玩家當前手牌(最多 8 張)
   - 橫向排列,置中對齊
   - 可點擊選擇要出的牌
   - Hover 效果:可選牌會輕微放大
   - 選中效果:選中的牌有明顯 highlight

**響應式設計要點**

- **遊戲容器**：固定 100vh × 100vw，使用 Flexbox 垂直排列，禁止溢出滾動
- **頂部資訊列**：佔 10% 高度，最小高度 80px
- **對手已獲得牌區**：佔 15% 高度，允許橫向滾動
- **場中央牌區**：佔 30% 高度，使用 Grid 布局（2 行 × 4 列）
- **玩家已獲得牌區**：佔 15% 高度，允許橫向滾動
- **玩家手牌區**：佔 25% 高度，使用 Flexbox 置中對齊
- **手機直向模式調整**：
  - 場牌區改為 2 列 × 4 行
  - 手牌區增加至 30% 高度並允許橫向滾動

---

#### 2.1.3 核心遊戲功能

前端應實作以下核心功能，遵循 [game-flow.md](./game-flow.md) 定義的命令-事件模式：

**遊戲初始化**
- 透過 REST API 發送加入遊戲命令
- 建立 SSE 連接以接收伺服器事件
- 保存 session token 用於斷線重連

**遊戲狀態管理**
- 維護遊戲狀態（FlowStage、卡牌位置、分數、當前玩家等）
- 根據 FlowStage 控制 UI 可操作性
- 同步處理 SSE 事件以更新狀態

**玩家操作**
- 打出手牌：發送命令到後端，等待 SSE 事件確認
- 選擇配對目標：當多張牌可配對時，選擇特定目標
- Koi-Koi 決策：形成役種後選擇繼續或結束

**SSE 事件處理**
- 監聽所有遊戲事件（TurnStarted、CardPlayedFromHand、TurnYakuFormed 等）
- 更新 UI 狀態並播放對應動畫
- 處理斷線重連的 GameSnapshotRestore 事件

**錯誤處理**
- 處理 TurnError 事件（無效操作、流程錯誤等）
- 網路斷線時自動重連（指數退避策略）
- 顯示友善的錯誤提示訊息

**詳細規格請參考**：
- API 端點與命令定義：[2.2 節](#22-後端功能)
- SSE 事件定義：[2.2 節](#server-sent-events-sse-設計)
- 通訊流程圖：[4.2 節](#42-通訊流程圖)
- 斷線重連機制：[4.3 節](#43-sse-容錯與重連設計)
- 完整命令與事件規格：[game-flow.md](./game-flow.md)

---

#### 2.1.4 視覺回饋與互動

**視覺 Feedback**
- **可選狀態**:手牌 hover 時輕微放大、陰影效果
- **選中狀態**:選中的手牌明顯 highlight(如邊框發光)
- **配對提示**:場上同月份的牌自動 highlight(邊框顏色變化)
- **配對動畫**:配對成功時,牌飛向獲得區(CSS transition 或 GSAP)
- **役種特效**:成立役種時,相關牌閃光或粒子效果
- **回合指示**:當前回合方有明顯的視覺標記(如發光邊框)

**錯誤處理與提示**
- **網路斷線**:顯示「連線中斷,正在嘗試重連...」
- **無效操作**:提示「此操作無效」,並簡短說明原因
- **後端錯誤**:友善的錯誤訊息,避免技術術語
- **SSE 重連**:自動嘗試重連,顯示重連狀態(詳見 4.3 節)

**輔助功能**
- **規則提示**:點擊 [規則] 按鈕顯示 Modal,解釋當前可能的役種
- **遊戲記錄**:顯示當前遊戲的出牌歷史(可選 MVP 功能)
- **Tooltip**:Hover 牌時顯示牌名(如「松鶴」、「櫻幕」)

---

### 2.2 後端功能

#### 核心業務邏輯

**遊戲規則服務 (GameRuleService)**
- 驗證操作合法性
  - 檢查牌是否在玩家手中
  - 檢查配對是否有效(同月份)
- 處理配對邏輯
  - 單一配對
  - 多重配對選擇
  - 牌堆配對(系統自動)
- 判斷遊戲結束條件
  - 牌堆耗盡
  - 玩家/對手選擇「勝負」
- 處理 Koi-Koi 決策邏輯

**役種檢測服務 (YakuDetectionService)**

MVP 實作 12 種常用役種:
- 光牌系(4種): 五光、四光、雨四光、三光
- 短冊系(3種): 赤短、青短、短冊
- 種牌系(4種): 豬鹿蝶、花見酒、月見酒、種
- かす系(1種): かす

註: 特殊役種(手四、月見、親權)規劃在 Post-MVP 階段實作

完整役種列表參考 [rule.md](./rule.md#役種列表)

**對手策略 (OpponentStrategy)**

MVP 實作簡易策略:
- 從手牌隨機選擇一張牌
- 若有多張可配對場牌,隨機選擇一張
- 牌堆翻牌的配對由系統自動處理
- Koi-Koi 決策:簡單策略(如低分繼續,高分停止)

#### REST API 設計

本專案採用 **命令-事件模式 (Command-Event Model)**，客戶端透過 REST API 發送命令，伺服器透過 SSE 推送事件。

**API 端點設計**

遵循 [game-flow.md](./game-flow.md) 定義的命令結構，映射如下：

| 命令名稱 (game-flow.md) | REST API 端點 | HTTP 方法 | 限制 Flow Stage |
|------------------------|--------------|----------|----------------|
| `GameRequestJoin` | `/api/v1/games/join` | POST | N/A (初始化/重連) |
| `TurnPlayHandCard` | `/api/v1/games/{gameId}/turns/play-card` | POST | `AWAITING_HAND_PLAY` |
| `TurnSelectMatchedCard` | `/api/v1/games/{gameId}/turns/select-match` | POST | `AWAITING_SELECTION` |
| `RoundMakeDecision` | `/api/v1/games/{gameId}/rounds/decision` | POST | `AWAITING_DECISION` |
| `ClientAcknowledgeEvent` | `/api/v1/games/{gameId}/events/{eventId}/ack` | POST | N/A (可選) |

**Request/Response 範例**

```json
// POST /api/v1/games/join
{
  "player_id": "uuid-string",
  "session_token": "xxx"  // 重連時提供
}
// Response: 200 OK
{
  "game_id": "uuid-string",
  "session_token": "xxx",
  "is_reconnect": false
}

// POST /api/v1/games/{gameId}/turns/play-card
{
  "card_id_to_play": "uuid-string"
}
// Response: 200 OK (空，狀態變更透過 SSE 推送)

// POST /api/v1/games/{gameId}/turns/select-match
{
  "source_card_id": "uuid-string",
  "selected_target_id": "uuid-string"
}
// Response: 200 OK

// POST /api/v1/games/{gameId}/rounds/decision
{
  "decision_type": "KOI_KOI"  // 或 "END_ROUND"
}
// Response: 200 OK
```

**FlowStage 狀態機**

遊戲流程由以下狀態驅動，每個 SSE 事件會包含 `required_stage` 欄位，指示客戶端下一步應等待的命令：

| 狀態值 | 說明 |
|--------|------|
| `AWAITING_HAND_PLAY` | 等待玩家打出手牌 |
| `AWAITING_SELECTION` | 等待玩家選擇配對目標 |
| `AWAITING_DECISION` | 等待玩家做 Koi-Koi 決策 |

---

#### Server-Sent Events (SSE) 設計

伺服器透過 SSE 推送原子化事件，遵循**最小增量原則**。事件分為兩類：

**A. 遊戲局級事件 (Round Session Events)**

描述整局遊戲的生命週期事件。

| 事件名稱 | 描述 | 核心 Payload | 觸發時機 |
|---------|------|-------------|---------|
| `GameStarted` | 遊戲會話開始 | `player_details`, `game_ruleset`, `total_rounds` | 遊戲初始化完成 |
| `RoundDealt` | 新的一局發牌完成 | `current_dealer_id`, `initial_field_cards` (8張), `hand_size` (雙方各8張) | 每局開始 |
| `RoundEndedInstantly` | 局開始時立即結束 | `winner_id` (或 null), `reason` (Enum: TESHI/KUTTSUKI/FIELD_DRAW), `score_change` | 特殊規則觸發 |
| `RoundDecisionMade` | 玩家做出 Koi-Koi 決策 | `player_id`, `decision_type` (KOI_KOI/END_ROUND), `new_koi_koi_multiplier` | 玩家選擇後 |
| `RoundScored` | 局最終分數結算 | `winning_player_id`, `yaku_list` (YakuScore[]), `total_multipliers`, `final_score_change` | 局結束 |
| `RoundDrawn` | 雙方手牌用罄平局 | `score_change` (根據規則變體) | 牌堆耗盡且無役種 |
| `GameFinished` | 整個遊戲會話結束 | `final_scores`, `winner_id` | 達到結束條件 |

**B. 回合級事件 (Turn Session Events)**

描述單一玩家操作的細粒度狀態變更。

| 事件名稱 | 描述 | 核心 Payload | 觸發時機 |
|---------|------|-------------|---------|
| `TurnStarted` | 回合開始 | `active_player_id`, `required_stage` (FlowStage) | 每個玩家回合開始 |
| `CardPlayedFromHand` | 玩家打出手牌並完成配對 | `player_id`, `CardCapture` (卡牌移動詳情) | 玩家出牌後 |
| `CardFlippedFromDeck` | 從牌堆翻牌並完成配對 | `player_id`, `CardCapture`, `is_deck_empty` | 出牌後自動翻牌 |
| `TurnSelectionRequired` | 需要玩家選擇配對目標 | `player_id`, `source_card_id`, `possible_targets` (Card ID[]) | 出現多張可配對牌 |
| `TurnYakuFormed` | 玩家形成新役種 | `player_id`, `newly_formed_yaku` (YakuScore[]), `current_base_score`, `required_stage` (AWAITING_DECISION) | 役種檢測通過 |
| `TurnEnded` | 回合結束 | `next_player_id` | 回合操作完成 |
| `TurnError` | 操作錯誤 | `error_code`, `message` | 無效命令 |

**SSE 連接端點**

```
GET /api/v1/games/{gameId}/events?sessionToken={token}
```

**事件格式範例**

```
id: 42
event: TurnStarted
data: {"active_player_id":"player-uuid","required_stage":"AWAITING_HAND_PLAY","timestamp":"2025-10-20T10:30:00Z"}

id: 43
event: CardPlayedFromHand
data: {"player_id":"player-uuid","capture":{"source_card":{"card_id":"xxx","month":1,"type":"BRIGHT"},"captured_cards":[{"card_id":"yyy","month":1,"type":"ANIMAL"}],"target_zone":"DEPOSITORY"}}

id: 44
event: TurnSelectionRequired
data: {"player_id":"player-uuid","source_card_id":"xxx","possible_targets":["yyy","zzz"]}
```

完整的命令與事件定義請參考 [game-flow.md](./game-flow.md)。


---

## 3. 非功能需求

### 3.1 效能需求
- **API 回應時間**: < 500ms (P95)
- **遊戲狀態查詢**: < 200ms
- **SSE 事件推送延遲**: < 100ms
- **支援並發遊戲數**: 100+ (MVP 階段)
- **對手操作計算時間**: < 1 秒

### 3.2 可擴展性設計

**微服務預備架構**

MVP 階段採用單體應用,但設計上預留微服務化路徑:

- **Game Service**(核心遊戲邏輯) - MVP 實作
- **Opponent Service**(未來可獨立擴展,提供多種難度/策略)
- **User Service**(預留帳號系統)
- **Matchmaking Service**(預留多人對戰)
- **Analytics Service**(預留數據分析)

**分散式系統考量**

- **UUID 作為 Game ID**: 避免分散式環境 ID 衝突
- **遊戲狀態序列化**: 便於跨服務傳輸
- **事件驅動架構預留**: 遊戲事件可發布到訊息佇列
- **無狀態 API 設計**: 所有狀態存於資料庫,便於水平擴展
- **快取整合預留**: 減少 DB 查詢,支援 SSE 多實例

**擴展路徑示意**

```
Phase 1 (MVP):
[Frontend] ←→ [Monolithic Backend] ←→ [PostgreSQL]

Phase 2 (多人對戰):
[Frontend] ←→ [API Gateway] ←→ [Game Service]
                            ←→ [Matchmaking Service]
                            ←→ [User Service]
                                    ↓
                              [PostgreSQL + Redis]

Phase 3 (分散式):
[Frontend] ←→ [API Gateway] ←→ [Game Service Cluster]
                            ←→ [Opponent Service Cluster]
                            ←→ [User Service]
                                    ↓
                            [Event Bus (Kafka)]
                                    ↓
                        [PostgreSQL Cluster + Redis Cluster]
```

### 3.3 可維護性
- **Clean Architecture**: 嚴格分層(Domain、Application、Infrastructure、Adapter)
- **單元測試覆蓋率**: > 80%(重點在核心業務邏輯)
- **API 文檔自動生成**: Swagger/OpenAPI 3.0
- **程式碼風格檢查**: Checkstyle / SonarQube
- **Git Commit 規範**: Conventional Commits
- **Code Review**: Pull Request 必須經過 Review

### 3.4 安全性
- **CORS 設定**: 僅允許前端網域
- **API Rate Limiting**(預留): 可用 Redis + Bucket4j 實作
- **Input Validation**: Bean Validation (JSR-380)
- **SQL Injection 防護**: 使用 JPA/Hibernate Prepared Statements
- **XSS 防護**: 前端 sanitize input,後端回傳適當的 Content-Type
- **HTTPS 強制**: 生產環境強制 HTTPS
- **敏感資料保護**: 密碼等使用環境變數,不寫入程式碼

### 3.5 可觀測性(Observability)
- **日誌 (Logging)**: 使用 SLF4J + Logback
  - 結構化日誌(JSON format)
  - 不同層級(INFO, WARN, ERROR)
- **監控 (Monitoring)**(預留):
  - Spring Boot Actuator
  - Prometheus + Grafana
- **追蹤 (Tracing)**(預留):
  - 分散式追蹤(如 Zipkin)

---

## 4. 通訊架構設計

### 4.1 REST + SSE 混合架構

**設計原則**
- **RESTful API**: 處理一次性操作與狀態查詢
- **SSE**: 處理 Server 主動推送事件(對手操作、遊戲狀態更新)

**為什麼選擇 SSE?**

相較於其他方案:

| 方案 | 優點 | 缺點 | 適用場景 |
|------|------|------|----------|
| **短輪詢** | 實作簡單 | 頻繁請求浪費資源 | 對即時性要求低 |
| **長輪詢** | 減少無效請求 | Server 資源佔用高 | 過渡方案 |
| **SSE** | Server 主動推送、自動重連、基於 HTTP | 單向通訊 | Server → Client 事件流 |
| **WebSocket** | 雙向通訊、低延遲 | 複雜度高、需要額外管理 | 即時多人互動 |

**MVP 採用 SSE 的理由**:
1. ✅ 滿足 Server 主動推送需求(對手操作、遊戲事件)
2. ✅ 實作簡單,Spring 原生支援
3. ✅ 自動重連機制
4. ✅ 適合單向事件流(Server → Client)
5. ✅ 易於測試與除錯
6. ✅ 未來可平滑升級到 WebSocket(多人對戰時)

### 4.2 通訊流程圖

**完整遊戲流程**（遵循 game-flow.md 命令-事件模式）

```
════════════════════════════════════════════════════════════════
階段 1: 遊戲初始化
════════════════════════════════════════════════════════════════

Frontend → POST /api/v1/games/join
           {player_id: "player-uuid"}
                                      ← 200 OK {game_id, session_token}

Frontend → GET /api/v1/games/{gameId}/events?sessionToken={token}
                                                                  ← SSE Stream

Backend → SSE: GameStarted
         {player_details, game_ruleset, total_rounds}

Backend → SSE: RoundDealt
         {current_dealer_id, initial_field_cards (8張), hand_size: 8}

Backend → SSE: TurnStarted
         {active_player_id: "player-uuid", required_stage: "AWAITING_HAND_PLAY"}


════════════════════════════════════════════════════════════════
階段 2: 玩家回合 (正常流程 - 無需選擇配對)
════════════════════════════════════════════════════════════════

Frontend → POST /api/v1/games/{gameId}/turns/play-card
           {card_id_to_play: "card-uuid"}
                                                        ← 200 OK

Backend → SSE: CardPlayedFromHand
         {player_id, CardCapture: {source_card, captured_cards, target_zone}}

Backend → SSE: CardFlippedFromDeck
         {player_id, CardCapture, is_deck_empty: false}

[情況 A: 未形成役種]
Backend → SSE: TurnEnded
         {next_player_id: "opponent-uuid"}

Backend → SSE: TurnStarted
         {active_player_id: "opponent-uuid", required_stage: "AWAITING_HAND_PLAY"}

[對手回合自動執行，推送相同的 Card*/Turn* 事件]


════════════════════════════════════════════════════════════════
階段 3: 玩家回合 (需要選擇配對)
════════════════════════════════════════════════════════════════

Frontend → POST /api/v1/games/{gameId}/turns/play-card
           {card_id_to_play: "card-uuid"}
                                                        ← 200 OK

[手牌配對發現兩張可配對場牌]
Backend → SSE: TurnSelectionRequired
         {player_id, source_card_id: "xxx", possible_targets: ["yyy", "zzz"]}
         // 注意: 此時 required_stage 變為 "AWAITING_SELECTION"

Frontend → POST /api/v1/games/{gameId}/turns/select-match
           {source_card_id: "xxx", selected_target_id: "yyy"}
                                                             ← 200 OK

Backend → SSE: CardPlayedFromHand
         {player_id, CardCapture (包含選中的配對)}

[繼續翻牌流程]
Backend → SSE: CardFlippedFromDeck
         {player_id, CardCapture, is_deck_empty: false}

[若翻牌也需要選擇，重複上述 TurnSelectionRequired 流程]

Backend → SSE: TurnEnded
         {next_player_id: "opponent-uuid"}


════════════════════════════════════════════════════════════════
階段 4: 役種形成與 Koi-Koi 決策
════════════════════════════════════════════════════════════════

[玩家回合，配對完成後檢測到役種]
Backend → SSE: TurnYakuFormed
         {
           player_id,
           newly_formed_yaku: [
             {yaku_type: "AKATAN", base_points: 5},
             {yaku_type: "TANZAKU", base_points: 1}
           ],
           current_base_score: 6,
           required_stage: "AWAITING_DECISION"
         }

Frontend → POST /api/v1/games/{gameId}/rounds/decision
           {decision_type: "KOI_KOI"}
                                                        ← 200 OK

Backend → SSE: RoundDecisionMade
         {player_id, decision_type: "KOI_KOI", new_koi_koi_multiplier: 2}

Backend → SSE: TurnEnded
         {next_player_id: "opponent-uuid"}

[遊戲繼續]


════════════════════════════════════════════════════════════════
階段 5: 局結束與分數結算
════════════════════════════════════════════════════════════════

[情況 A: 玩家選擇「勝負」(END_ROUND)]
Frontend → POST /api/v1/games/{gameId}/rounds/decision
           {decision_type: "END_ROUND"}
                                                        ← 200 OK

Backend → SSE: RoundDecisionMade
         {player_id, decision_type: "END_ROUND"}

Backend → SSE: RoundScored
         {
           winning_player_id: "player-uuid",
           yaku_list: [{yaku_type: "AKATAN", base_points: 5}, ...],
           total_multipliers: 4,  // 含 Koi-Koi 倍率 + 7點以上倍率
           final_score_change: {player: +20, opponent: 0}
         }

[情況 B: 牌堆耗盡平局]
Backend → SSE: RoundDrawn
         {score_change: {player: 0, opponent: 0}}

[新局開始]
Backend → SSE: RoundDealt
         {...}

[情況 C: 遊戲結束]
Backend → SSE: GameFinished
         {final_scores: {player: 150, opponent: 80}, winner_id: "player-uuid"}


════════════════════════════════════════════════════════════════
階段 6: 特殊情況處理
════════════════════════════════════════════════════════════════

[A. 錯誤操作]
Backend → SSE: TurnError
         {error_code: "INVALID_CARD", message: "此牌不在手牌中"}

[B. 斷線重連 - 詳見 4.3.2 節]

[C. 放棄遊戲 (可選實作)]
Frontend → DELETE /api/v1/games/{gameId}
                                        ← 200 OK

Backend → SSE: GameFinished
         {final_scores, winner_id: "opponent-uuid", reason: "SURRENDER"}
```

**流程關鍵點說明**

1. **FlowStage 控制**: 每個 SSE 事件帶有 `required_stage`，前端依此決定啟用哪些操作
2. **選擇配對邏輯**:
   - 手牌配對：多張可配對時觸發 `TurnSelectionRequired`，玩家必須選擇
   - 牌堆配對：同樣可能觸發選擇流程（例如翻出的牌與場上兩張牌配對）
3. **事件順序**: 嚴格遵循 `CardPlayedFromHand` → `CardFlippedFromDeck` → `TurnYakuFormed` (if any) → `TurnEnded`
4. **對手回合**: 推送相同的事件結構，前端自動渲染

### 4.3 SSE 容錯與重連設計

**斷線重連機制**（遵循 game-flow.md 快照模式）

SSE 原生支援自動重連，但需要應用層面的支援以確保狀態一致性。本專案採用 **狀態快照 (Snapshot) 模式** 進行重連，而非事件補發。

#### 4.3.1 事件序號機制

**目的**: 檢測事件遺漏，觸發快照恢復

- 每個 SSE 事件都帶有遞增的 `id` 欄位（序號）
- 後端維護每個遊戲的事件序號計數器
- 所有事件持久化到資料庫（用於審計與重建狀態）

**範例**:
```
id: 42
event: TurnStarted
data: {"active_player_id":"player-uuid","required_stage":"AWAITING_HAND_PLAY","timestamp":"2025-10-20T10:30:01Z"}

id: 43
event: CardPlayedFromHand
data: {"player_id":"player-uuid","capture":{...}}
```

#### 4.3.2 重連流程（快照模式）

**觸發時機**:
- 客戶端偵測到 SSE 連線斷開（`onerror` 事件）
- 頁面重新載入（從 `localStorage` 恢復 `session_token`）
- 網路環境變更（如 Wi-Fi 切換）

**流程**:

```
1. 客戶端偵測斷線
   ↓
2. 保存 session_token 到 localStorage
   ↓
3. 使用指數退避策略重連 (1s, 2s, 4s, 8s, 16s, 最大 30s)
   ↓
4. 發送重連命令:
   POST /api/v1/games/join
   {
     "player_id": "player-uuid",
     "session_token": "saved-token"
   }
   ↓
5. 伺服器判定為重連 (session_token 已存在)
   ↓
6. 通過 SSE 推送 GameSnapshotRestore 事件
   ↓
7. 客戶端接收快照，完整恢復 UI 狀態
```

**GameSnapshotRestore 事件結構**（遵循 game-flow.md）

```json
{
  "game_id": "uuid-string",
  "ruleset": {
    "variant": "KANTO",
    "total_rounds": 12
  },
  "player_scores": {
    "player-uuid": 50,
    "opponent-uuid": 30
  },

  "current_round": 3,
  "dealer_id": "player-uuid",
  "koi_koi_status": {
    "player_koi_koi_count": 1,
    "opponent_koi_koi_count": 0
  },

  "field_cards": [
    {"card_id": "card-1", "month": 1, "type": "BRIGHT", "display_name": "松鶴"},
    {"card_id": "card-2", "month": 3, "type": "RIBBON", "display_name": "櫻短冊"}
  ],
  "player_hand_cards": [
    {"card_id": "card-10", "month": 6, "type": "ANIMAL", "display_name": "牡丹蝶"}
  ],
  "opponent_hand_card_count": 5,
  "player_depositories": {
    "player-uuid": [
      {"card_id": "card-20", "month": 2, "type": "ANIMAL", "display_name": "梅鶯"}
    ],
    "opponent-uuid": []
  },
  "deck_remaining": 15,

  "current_flow_stage": "AWAITING_HAND_PLAY",
  "active_player_id": "player-uuid",
  "required_selection_context": null,
  "current_yaku": null
}
```

**前端恢復處理要點**:

客戶端接收到 `GameSnapshotRestore` 事件後，應執行以下步驟：
1. 恢復遊戲上下文（game_id、player_scores、ruleset）
2. 恢復牌面狀態（field_cards、hand_cards、depositories）
3. 恢復流程控制（current_flow_stage、active_player_id）
4. 根據 `current_flow_stage` 渲染對應 UI：
   - `AWAITING_HAND_PLAY`: 啟用手牌選擇
   - `AWAITING_SELECTION`: 顯示配對選擇 UI（使用 required_selection_context）
   - `AWAITING_DECISION`: 顯示 Koi-Koi 決策 Modal（使用 current_yaku）
5. 顯示「連線已恢復」提示訊息

**後端處理要點**:
- 維護 `session_token` → `game_id` 映射（使用 Redis 或記憶體 Map）
- 接收到帶有 `session_token` 的 `GameRequestJoin` 時，判定為重連
- 從資料庫載入完整遊戲狀態，構建快照
- 推送 `GameSnapshotRestore` 事件
- 繼續訂閱即時事件流

#### 4.3.3 Fallback 機制（短輪詢）

**觸發條件**:
- SSE 連線持續失敗超過最大重連次數（5 次）
- 偵測到客戶端環境不支援 SSE（如某些企業防火牆）

**實作方式**:
1. 提示使用者「SSE 連線失敗，切換到輪詢模式」
2. 使用定時器定期請求狀態快照（建議間隔 2 秒）
3. 比較快照與當前狀態，僅在有變化時更新 UI
4. 遊戲結束時停止輪詢

**新增 API 端點** (用於 Fallback):
```
GET /api/v1/games/{gameId}/snapshot
Headers: Authorization: Bearer {session_token}
Response: GameSnapshotRestore (JSON)
```

**注意事項**:
- 輪詢間隔不宜過短（建議 2-5 秒），避免伺服器負載過高
- 應提示使用者當前處於降級模式（如顯示「連線品質較差」）
- 若輪詢也持續失敗，建議提示使用者重新整理頁面

#### 4.3.4 重連策略總結

```
1. 偵測斷線 (SSE onerror)
   ↓
2. 保存 session_token 到 localStorage
   ↓
3. 自動重連 (指數退避: 1s, 2s, 4s, 8s, 16s, 最大 30s)
   ↓
4. 發送重連命令 (POST /api/v1/games/join 帶 session_token)
   ↓
5. 接收 GameSnapshotRestore 快照事件
   ↓
6. 完整恢復 UI 狀態 (根據 FlowStage 渲染)
   ↓
7. 若連續失敗 5 次:
   - 提示使用者「連線不穩定」
   - 切換到 Fallback 短輪詢模式 (GET /api/v1/games/{gameId}/snapshot)
   - 或提示使用者重新整理頁面
```

**優勢**:
- ✅ 簡化實作：無需追蹤「哪些事件錯過」，直接重建狀態
- ✅ 一致性保證：快照包含完整的遊戲狀態，避免增量事件丟失
- ✅ 易於測試：前端可用快照 Mock 數據測試各種局面

---

## 5. Clean Architecture 實踐指南

### 5.1 架構分層概覽

本專案嚴格遵循 Clean Architecture 原則,將系統分為四個同心圓層次:

```
┌─────────────────────────────────────────┐
│  Framework & Drivers (最外層)           │
│  ├─ Web (Spring MVC/WebFlux)           │
│  ├─ Database (JPA/PostgreSQL)          │
│  └─ External APIs                       │
│                                          │
│  ┌───────────────────────────────────┐ │
│  │  Interface Adapters (適配層)      │ │
│  │  ├─ Controllers (REST/SSE)        │ │
│  │  ├─ Presenters (DTO Mappers)     │ │
│  │  ├─ Gateways (Repository Impl)   │ │
│  │  └─ View Models                   │ │
│  │                                    │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Application Business Rules │ │ │
│  │  │  (Use Cases 層)             │ │ │
│  │  │  ├─ CreateGameUseCase       │ │ │
│  │  │  ├─ ExecuteActionUseCase    │ │ │
│  │  │  ├─ DetectYakuUseCase       │ │ │
│  │  │  └─ ...                     │ │ │
│  │  │                              │ │ │
│  │  │  ┌───────────────────────┐ │ │ │
│  │  │  │  Enterprise Business  │ │ │ │
│  │  │  │  Rules (Domain 層)    │ │ │ │
│  │  │  │  ├─ Game (Aggregate) │ │ │ │
│  │  │  │  ├─ Card (Entity)    │ │ │ │
│  │  │  │  ├─ Yaku (Value Obj) │ │ │ │
│  │  │  │  └─ GameRules        │ │ │ │
│  │  │  └───────────────────────┘ │ │ │
│  │  └─────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**依賴規則(Dependency Rule)**:
- 依賴箭頭只能由外層指向內層
- 內層不依賴外層(Domain 不依賴 Framework)
- 內層定義介面(Port),外層實作(Adapter)

---

### 5.2 各層職責說明

#### 5.2.1 Domain Layer (企業業務規則層)

**位置**: `src/main/java/com/hanafuda/domain`

**職責**:
- 包含純粹的業務邏輯,不依賴任何框架
- 定義領域模型(Entity、Value Object、Aggregate)
- 實作業務規則(如配對規則、役種檢測)

**核心概念**:
- **Aggregate Root**: Game 是聚合根,所有對遊戲狀態的修改都通過 Game
- **Value Object**: Card, Yaku, Action 等不可變對象
- **Domain Service**: 跨多個 Entity 的業務邏輯(如役種檢測)
- **Repository Interface**: Domain 層定義介面,Adapter 層實作

---

#### 5.2.2 Application Layer (應用業務規則層)

**位置**: `src/main/java/com/hanafuda/application`

**職責**:
- 編排領域對象完成特定用例(Use Case)
- 定義輸入/輸出 Port 介面
- 不包含業務邏輯,只負責協調

**目錄結構**:
```
application/
├─ usecase/
│  ├─ CreateGameUseCase.java
│  └─ ...
└─ port/
   ├─ in/                     (輸入 Port,由 Controller 呼叫)
   │  ├─ CreateGameCommand.java
   │  └─ ...
   └─ out/                    (輸出 Port,由 Adapter 實作)
      ├─ LoadGamePort.java
      └─ ...
```

**Use Case 特性**:
- 每個 Use Case 對應一個用戶操作
- Use Case 協調 Domain 對象,不包含業務邏輯
- Use Case 透過 Port 與外部系統互動
- Use Case 應可獨立測試(使用 Mock)

---

#### 5.2.3 Adapter Layer (介面適配層)

**位置**: `src/main/java/com/hanafuda/adapter`

**職責**:
- 實作 Application Layer 定義的 Port 介面
- 處理外部技術細節(REST、資料庫、SSE)
- 轉換資料格式(Domain ↔ DTO)

**目錄結構**:
```
adapter/
├─ in/                        (輸入適配器)
│  └─ web/
│     ├─ GameController.java  (REST API)
│     ├─ GameEventController.java (SSE)
│     └─ dto/
│        ├─ GameStateDTO.java
│        ├─ CardDTO.java
│        └─ ...
├─ out/                       (輸出適配器)
│  ├─ persistence/
│  │  ├─ GameRepositoryAdapter.java
│  │  ├─ entity/
│  │  │  └─ GameEntity.java
│  │  └─ mapper/
│  │     └─ GameMapper.java
│  └─ event/
│     └─ GameEventPublisher.java
└─ config/
   └─ BeanConfiguration.java   (DI 配置)
```

**Adapter 原則**:
- 永遠使用 DTO 與外部通訊,不暴露 Domain Model
- DTO 是扁平化的資料結構,便於序列化
- Mapper 負責 Domain ↔ DTO 轉換
- Repository Adapter 將 Domain Model 持久化

---

### 5.3 資料格式定義（Data Transfer Objects）

**設計原則**:
- 所有 API 與 SSE 通訊使用 JSON 格式
- 遵循 game-flow.md 定義的核心結構
- 使用基礎型別（string, number, boolean, array, object）便於跨語言實作
- 資料結構扁平化，便於序列化與傳輸

---

#### 核心資料結構（遵循 game-flow.md）

**Card（核心可重用結構）**

```json
{
  "card_id": "uuid-string",
  "month": 1,
  "type": "BRIGHT",
  "display_name": "松鶴"
}
```

| 欄位 | 型別 | 說明 |
|-----|------|------|
| `card_id` | string | 卡牌唯一識別碼（UUID） |
| `month` | number | 月份（1-12） |
| `type` | string | 卡牌類型："BRIGHT" / "ANIMAL" / "RIBBON" / "DREG" |
| `display_name` | string | 顯示名稱（如「松鶴」、「櫻幕」） |

---

**YakuScore（役種得分）**

```json
{
  "yaku_type": "GOKO",
  "base_points": 15
}
```

| 欄位 | 型別 | 說明 |
|-----|------|------|
| `yaku_type` | string | 役種類型（如 "GOKO", "AKATAN", "INOSHIKACHO"） |
| `base_points` | number | 基礎得分 |

---

**CardCapture（卡牌捕獲操作）**

```json
{
  "source_card": {
    "card_id": "card-1",
    "month": 1,
    "type": "BRIGHT",
    "display_name": "松鶴"
  },
  "captured_cards": [
    {
      "card_id": "card-2",
      "month": 1,
      "type": "ANIMAL",
      "display_name": "松短冊"
    }
  ],
  "target_zone": "DEPOSITORY"
}
```

| 欄位 | 型別 | 說明 |
|-----|------|------|
| `source_card` | Card | 來源牌（打出的手牌或翻出的牌堆牌） |
| `captured_cards` | Card[] | 捕獲的場牌列表（可能為空陣列） |
| `target_zone` | string | 目標區域："FIELD" 或 "DEPOSITORY" |

---

#### SSE 事件 Payload 格式

所有 SSE 事件的 `data` 欄位均為 JSON 格式。以下為各事件的資料結構範例：

**GameStarted**
```json
{
  "player_details": {
    "player-uuid-1": "Player 1",
    "player-uuid-2": "Player 2"
  },
  "game_ruleset": {
    "variant": "KANTO",
    "total_rounds": 12
  },
  "total_rounds": 12
}
```

**RoundDealt**
```json
{
  "current_dealer_id": "player-uuid",
  "initial_field_cards": [
    {"card_id": "card-1", "month": 1, "type": "BRIGHT", "display_name": "松鶴"}
  ],
  "hand_size": 8
}
```

**TurnStarted**
```json
{
  "active_player_id": "player-uuid",
  "required_stage": "AWAITING_HAND_PLAY",
  "timestamp": "2025-10-20T10:30:00Z"
}
```

**CardPlayedFromHand**
```json
{
  "player_id": "player-uuid",
  "capture": {
    "source_card": {"card_id": "card-1", "month": 1, "type": "BRIGHT", "display_name": "松鶴"},
    "captured_cards": [{"card_id": "card-2", "month": 1, "type": "ANIMAL", "display_name": "松短冊"}],
    "target_zone": "DEPOSITORY"
  }
}
```

**TurnSelectionRequired**
```json
{
  "player_id": "player-uuid",
  "source_card_id": "card-1",
  "possible_targets": ["card-2", "card-3"]
}
```

**TurnYakuFormed**
```json
{
  "player_id": "player-uuid",
  "newly_formed_yaku": [
    {"yaku_type": "GOKO", "base_points": 15}
  ],
  "current_base_score": 15,
  "required_stage": "AWAITING_DECISION"
}
```

**RoundScored**
```json
{
  "winning_player_id": "player-uuid",
  "yaku_list": [
    {"yaku_type": "GOKO", "base_points": 15}
  ],
  "total_multipliers": 2,
  "final_score_change": {
    "player-uuid": 30,
    "opponent-uuid": -30
  }
}
```

完整 SSE 事件列表請參考 [2.2 節](#server-sent-events-sse-設計) 與 [game-flow.md](./game-flow.md)。

---

#### REST API Request 格式

**POST /api/v1/games/join**
```json
{
  "player_id": "player-uuid",
  "session_token": "optional-token-for-reconnect"
}
```

**POST /api/v1/games/{gameId}/turns/play-card**
```json
{
  "card_id_to_play": "card-uuid"
}
```

**POST /api/v1/games/{gameId}/turns/select-match**
```json
{
  "source_card_id": "card-uuid-1",
  "selected_target_id": "card-uuid-2"
}
```

**POST /api/v1/games/{gameId}/rounds/decision**
```json
{
  "decision_type": "KOI_KOI"
}
```

（`decision_type` 可為 `"KOI_KOI"` 或 `"END_ROUND"`）

---

**資料格式原則總結**:
1. ✅ 所有資料結構遵循 game-flow.md 定義
2. ✅ 使用 JSON 格式，便於跨語言實作
3. ✅ 核心結構（Card, YakuScore, CardCapture）保持一致性
4. ✅ 欄位命名使用 snake_case（JSON 慣例）
5. ✅ 所有 ID 使用 string 型別（UUID）

---

### 5.4 依賴注入配置

使用 Spring 的 `@Configuration` 和 `@Bean` 手動配置依賴注入,確保依賴方向正確:


---

### 5.5 測試策略

**各層測試重點**:

#### Domain Layer
- **單元測試**:測試純業務邏輯
- 不依賴任何框架,速度快
- 覆蓋率目標 > 90%
- 測試重點:配對規則、役種檢測、遊戲狀態轉換

#### Application Layer
- **整合測試**:使用 Mock 測試 Use Case
- 驗證編排邏輯正確性
- 測試重點:Use Case 流程、錯誤處理、事件發布

#### Adapter Layer
- **整合測試**:測試 Controller、Repository
- 使用 Spring Test Context
- 測試重點:API 端點、DTO 轉換、資料持久化

---

### 5.6 Clean Architecture 檢查清單

開發時確認:

- [ ] Domain Layer 不依賴任何外部框架
- [ ] Application Layer 只依賴 Domain Layer
- [ ] Use Case 不包含技術細節(如 JPA annotations)
- [ ] API Response 使用 DTO,不直接返回 Domain Model
- [ ] Repository 介面定義在 Domain Layer,實作在 Adapter Layer
- [ ] 所有業務邏輯在 Domain Layer,Use Case 只負責編排
- [ ] DTO ↔ Domain Model 轉換在 Adapter Layer 完成

---

## 6. 使用者體驗設計

### 6.1 視覺設計方向

**設計風格**: 傳統與現代融合

- **色彩方案**:
  - 主色: 深紅(#C41E3A) - 象徵日本傳統
  - 輔色: 金色(#D4AF37)、墨綠(#2C5F2D)
  - 背景: 米白(#F5F5DC)、深灰(#2B2B2B)
- **字體**:
  - 標題: 使用優雅的襯線字體(如 Noto Serif)
  - 內文: 清晰的無襯線字體(如 Inter, Noto Sans)
  - 牌名: 日文字體(如 Noto Sans JP)

**牌面設計**:
- 使用傳統花牌圖案(公有領域或開源資源)
- 適當放大重要牌(光札、種札)
- 高對比度,確保可辨識性

---

### 6.2 互動流程

**新手引導**:
1. 首頁展示吸引人的 Hero Section
2. 規則區塊提供清晰的圖文說明
3. 第一次遊戲時,提供「教學模式」(可選,Post-MVP)

**遊戲進行**:
1. 玩家選牌 → 高亮可配對牌 → 確認選擇
2. 動畫流暢,反饋即時
3. 役種達成時,特效明顯,文字清晰
4. 對手操作時,顯示「對手思考中」,避免使用者困惑

---

## 7. 開發階段規劃

### Phase 1: 環境設定與基礎架構 (Week 1)

**後端設定**
- [ ] 建立 Spring Boot 專案骨架
- [ ] 設定 PostgreSQL 資料庫連線
- [ ] 實作 Clean Architecture 目錄結構
- [ ] 設定 JPA 與 Hibernate
- [ ] 建立基礎 Domain Model(Card, Game, GameState)

**前端設定**
- [ ] 建立 Vue 3 + TypeScript 專案
- [ ] 設定 Tailwind CSS
- [ ] 建立基礎路由(Home, Game)
- [ ] 設定 Axios/Fetch 客戶端

**DevOps**
- [ ] 設定 Docker Compose(PostgreSQL + Backend + Frontend)
- [ ] 建立 Git Repository 與 Branching Strategy
- [ ] 設定 CI 基礎(GitHub Actions)

---

### Phase 2: 核心遊戲邏輯 (Week 2-3)

**Domain Layer**
- [ ] 實作完整 Card Model
- [ ] 實作 Deck(牌堆)邏輯
- [ ] 實作 GameState(遊戲狀態管理)
- [ ] 實作配對規則(MatchingService)
- [ ] 實作役種檢測服務(YakuDetector) - MVP 實作 12 種常用役種
  - [ ] 光牌系(4種): 五光、四光、雨四光、三光
  - [ ] 短冊系(3種): 赤短、青短、短冊
  - [ ] 種牌系(4種): 豬鹿蝶、花見酒、月見酒、種
  - [ ] かす系(1種): かす
  - 註: 特殊役種(手四、月見、親權)在 Post-MVP 實作

**單元測試**
- [ ] Card 測試
- [ ] Deck 測試
- [ ] GameState 測試
- [ ] YakuDetector 測試(12 種常用役種，詳見上方列表)

---

### Phase 3: Use Case 與 API 實作 (Week 3-4)

**Application Layer**

核心 Use Cases（對應 game-flow.md 命令）：

- [ ] **JoinGameUseCase** - 處理玩家加入遊戲或重連
  - 檢查 session_token 是否存在（重連邏輯）
  - 建立新遊戲或恢復現有遊戲狀態
  - 配對對手（MVP 為電腦對手）
  - 初始化遊戲狀態並發牌

- [ ] **PlayHandCardUseCase** - 處理玩家打出手牌
  - 驗證牌是否在玩家手中
  - 驗證當前 FlowStage 是否為 AWAITING_HAND_PLAY
  - 檢查配對邏輯（單一配對 vs. 多重配對）
  - 觸發相應的 SSE 事件

- [ ] **SelectMatchedCardUseCase** - 處理玩家選擇配對目標
  - 驗證當前 FlowStage 是否為 AWAITING_SELECTION
  - 驗證選擇的目標是否合法
  - 完成配對並更新遊戲狀態
  - 觸發後續流程（翻牌、役種檢測）

- [ ] **MakeKoiKoiDecisionUseCase** - 處理 Koi-Koi 決策
  - 驗證當前 FlowStage 是否為 AWAITING_DECISION
  - 處理「繼續」或「勝負」決策
  - 更新 Koi-Koi 倍率或結算分數
  - 判斷局是否結束

- [ ] **ExecuteOpponentTurnUseCase** - 執行對手回合
  - 呼叫 OpponentStrategy 選擇手牌
  - 自動處理配對邏輯
  - 處理對手的 Koi-Koi 決策
  - 推送對手操作的 SSE 事件

- [ ] **DetectYakuUseCase** - 檢測役種
  - 分析玩家已獲得牌
  - 判斷成立的役種列表
  - 計算基礎分數

**Adapter Layer - REST API**

REST API 端點實作（詳見第 2.2 節完整定義）：

- [ ] **POST /api/v1/games/join** - 對應 JoinGameUseCase
- [ ] **POST /api/v1/games/{gameId}/turns/play-card** - 對應 PlayHandCardUseCase
- [ ] **POST /api/v1/games/{gameId}/turns/select-match** - 對應 SelectMatchedCardUseCase
- [ ] **POST /api/v1/games/{gameId}/rounds/decision** - 對應 MakeKoiKoiDecisionUseCase
- [ ] **GET /api/v1/games/{gameId}/events** - SSE 事件推送端點
- [ ] **GET /api/v1/games/{gameId}/snapshot** - 獲取遊戲狀態快照（用於 Fallback）

**Repository 實作**
- [ ] JPA Entities
- [ ] GameRepositoryAdapter
- [ ] 資料庫 Schema 建立
- [ ] Migration Scripts(Flyway)

**整合測試**
- [ ] API 端點測試
- [ ] Repository 測試

---

### Phase 4: SSE 整合與對手實作 (Week 4-5)

**SSE 實作**
- [ ] GET /api/v1/games/{gameId}/events
- [ ] GameEventService
- [ ] 事件序號機制
- [ ] 事件持久化
- [ ] 所有事件類型實作
- [ ] 重連邏輯(前端 + 後端)

**對手策略**
- [ ] OpponentStrategy 實作
- [ ] 對手 Koi-Koi 決策邏輯

**測試**
- [ ] SSE 功能測試
- [ ] 重連機制測試

---

### Phase 5: 前端 UI/UX 實作 (Week 5-6)

**首頁**
- [ ] Hero Section
- [ ] 規則介紹區
- [ ] 版權聲明區
- [ ] 導航列

**遊戲頁面**
- [ ] 遊戲區塊佈局(5 個區域)
- [ ] 牌面渲染
- [ ] 玩家手牌互動
- [ ] 配對動畫
- [ ] 役種特效
- [ ] SSE 事件監聽與處理
- [ ] 錯誤處理

**樣式**
- [ ] Tailwind 客製化配置
- [ ] 響應式設計
- [ ] 深色模式(可選)

---

### Phase 6: 整合測試與優化 (Week 6)

**功能測試**
- [ ] 完整遊戲流程測試
- [ ] 12 種常用役種檢測驗證
- [ ] Koi-Koi 決策測試
- [ ] 斷線重連測試
- [ ] 錯誤處理測試

**效能優化**
- [ ] API 回應時間優化
- [ ] SSE 推送延遲優化
- [ ] 前端動畫流暢度優化
- [ ] 資料庫查詢優化

**程式碼品質**
- [ ] Code Review
- [ ] SonarQube 檢查
- [ ] 重構技術債
- [ ] Logging 完善

---

### Phase 7: 測試、部署與文檔 (Week 7)

**測試**
- [ ] 後端單元測試覆蓋率檢查
- [ ] 後端整合測試
- [ ] 前端組件測試(Vitest)
- [ ] E2E 測試(Playwright / Cypress)(可選)
- [ ] 跨瀏覽器測試(Chrome, Firefox, Safari, Edge)
- [ ] 效能測試(Lighthouse)

**部署準備**
- [ ] Dockerfile(前端 + 後端)
- [ ] Docker Compose(完整環境)
- [ ] 環境變數配置(dev, staging, prod)
- [ ] CI/CD Pipeline(GitHub Actions)

**文檔**
- [ ] API 文檔(Swagger UI)
- [ ] README.md 完善
- [ ] 開發文檔(如有需要)
- [ ] 使用者手冊(遊戲規則與玩法)

**上線檢查清單**
- [ ] 安全性檢查(OWASP Top 10)
- [ ] 效能測試達標
- [ ] 錯誤處理完整
- [ ] 日誌系統運作正常
- [ ] 備份策略(資料庫)

---

## 8. 風險與挑戰

### 8.1 技術風險

| 風險 | 影響程度 | 可能性 | 緩解策略 |
|------|---------|--------|---------|
| Clean Architecture 過度設計導致開發緩慢 | 中 | 中 | 先實作核心層,介面層可簡化;定期 Review 設計 |
| 役種判定邏輯複雜,Bug 率高 | 高 | 高 | TDD 開發;完整單元測試;手動測試驗證 |
| SSE 連線穩定性問題 | 中 | 低 | 實作重連機制;提供 fallback(短輪詢) |
| 前端動畫效能問題 | 中 | 中 | 使用 requestAnimationFrame;節流處理;提供關閉選項 |
| 花牌資源版權問題 | 高 | 低 | 使用 Public Domain 或自製資源;明確標示授權 |
| 跨瀏覽器相容性 | 低 | 低 | 早期進行跨瀏覽器測試;使用 Polyfill |

### 8.2 產品風險

| 風險 | 影響程度 | 可能性 | 緩解策略 |
|------|---------|--------|---------|
| 新手學習曲線過高 | 高 | 中 | 互動式教學;清晰的規則說明;tooltips |
| 遊戲節奏過慢 | 中 | 中 | 對手操作動畫可加速;提供「快速模式」 |
| 缺乏長期吸引力 | 中 | 高 | 規劃成就系統、排行榜(Post-MVP) |
| 國際玩家對花牌不熟悉 | 高 | 高 | 強化文化背景介紹;提供詳細規則 |

### 8.3 時程風險

| 風險 | 影響程度 | 可能性 | 緩解策略 |
|------|---------|--------|---------|
| 功能範圍蔓延(Scope Creep) | 高 | 中 | 嚴格遵循 MVP 範圍;額外功能記錄到 Backlog |
| 技術學習曲線(Java/Spring Boot) | 中 | 低 | 預留學習時間;參考官方文檔與範例 |
| 低估測試時間 | 中 | 高 | Phase 7 預留充足時間;持續整合測試 |

---

## 9. 成功指標

### 9.1 MVP 階段指標

**功能完整度**
- [ ] 100% 實作所有 MVP 功能需求
- [ ] 12 種常用役種正確檢測(光牌系4種、短冊系3種、種牌系4種、かす系1種)
- [ ] 遊戲流程無阻塞性 Bug

**技術指標**
- [ ] 後端單元測試覆蓋率 > 80%
- [ ] 前端組件測試覆蓋率 > 60%
- [ ] API P95 回應時間 < 500ms
- [ ] SSE 事件推送延遲 < 100ms
- [ ] 支援 100+ 並發遊戲

**使用者體驗**
- [ ] 新手玩家可在 5 分鐘內完成第一場遊戲
- [ ] 規則說明清晰度評分 > 4/5(使用者測試)
- [ ] 無重大 UI/UX 問題回報

**程式碼品質**
- [ ] Clean Architecture 分層清晰
- [ ] 無 Critical/High 等級的 SonarQube 警告
- [ ] API 文檔完整

### 9.2 未來擴展指標(Post-MVP)

**使用者成長**
- 月活躍使用者 (MAU) > 1,000
- 平均每使用者遊戲場次 > 5 場/月
- 新使用者留存率(7日) > 30%

**技術進化**
- 成功實作多人對戰功能
- 微服務架構拆分完成
- 系統可擴展至 1,000+ 並發

---

## 10. 未來擴展方向

### Phase 2: 使用者系統與社交功能 (Post-MVP)

**帳號系統**
- 使用者註冊與登入(JWT Authentication)
- 個人資料管理
- 遊戲歷史記錄
- 統計數據(勝率、常用役種等)

**社交功能**
- 好友系統
- 線上玩家列表
- 遊戲邀請
- 簡易聊天功能

**排行榜**
- 全球排行榜
- 每週/每月排行榜
- 好友排行榜

---

### Phase 3: 多人對戰與進階功能

**多人對戰**
- 配對系統(Matchmaking)
- 即時對戰(WebSocket)
- 觀戰功能
- 重播系統

**進階對手策略**
- 多種難度等級(簡單、中等、困難)
- 策略型對手(不只是隨機)
- 對手個性化(不同風格)

**自訂規則**
- 可調整役種分數
- 啟用/停用特定役種
- 自訂遊戲時長

---

### Phase 4: 系統優化與分散式架構

**微服務拆分**
- Game Service
- User Service
- Matchmaking Service
- Opponent Service
- Analytics Service

**分散式系統技術**
- 事件驅動架構(Kafka / RabbitMQ)
- 分散式快取(Redis Cluster)
- 資料庫分片(Sharding)
- 負載平衡(Nginx / HAProxy)

**可觀測性提升**
- 分散式追蹤(Zipkin / Jaeger)
- 集中式日誌(ELK Stack)
- 監控儀表板(Grafana + Prometheus)

---

### Phase 5: 擴展遊戲內容

**多語言支援**
- 日文、中文(繁體/簡體)
- 多語言規則說明

**成就系統**
- 各種成就徽章
- 成就追蹤
- 稀有成就

**教學模式**
- 互動式教學關卡
- 步驟提示
- 練習模式

**主題與外觀**
- 多種牌面風格
- 背景主題切換
- 音效與背景音樂

---

## 11. 附錄

### 11.1 花牌基礎資料

參考[卡片列表](./rule.md#卡片列表)

---

### 11.2 參考資源

#### 規則參考
- [Koi-Koi - Wikipedia (EN)](https://en.wikipedia.org/wiki/Koi-Koi)
- [Hanafuda - Fuda Wiki](https://fudawiki.org/en/hanafuda/games/koi-koi)
- [Japanese Hanafuda Guide](https://www.hanafudahawaii.com/)
- [nintendo](https://www.nintendo.com/jp/others/hanafuda_kabufuda/howtoplay/koikoi/index.html)

#### 開源花牌圖檔資源
- **Hanafuda cards on Wikimedia Commons** (Public Domain)
  - https://commons.wikimedia.org/wiki/Category:Hanafuda
- **dotty-dev/Hanafuda-Louie-Recolor** (CC BY-SA 4.0)
  - https://github.com/dotty-dev/Hanafuda-Louie-Recolor
- **自製選項**:使用 Illustrator / Figma 重繪傳統圖案

#### 技術文檔
- **Clean Architecture** - Robert C. Martin
- **Domain-Driven Design** - Eric Evans
- **Spring Boot Documentation** - https://spring.io/projects/spring-boot
- **Vue 3 Documentation** - https://vuejs.org/
- **Server-Sent Events (MDN)** - https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

---

### 11.3 開發檢查清單

#### 開發前準備
- [ ] 確認花牌圖檔資源與授權
- [ ] 建立 GitHub Repository
- [ ] 設定開發環境
  - [ ] Java 17+ (建議 Java 21)
  - [ ] Node.js 18+
  - [ ] PostgreSQL 14+
  - [ ] Docker & Docker Compose
- [ ] IDE 設定(IntelliJ IDEA / VS Code)
- [ ] 準備 Figma/設計稿(optional)

#### 開發中
- [ ] 遵循 Clean Architecture 原則
- [ ] 每個 Feature 都有對應測試
- [ ] API 變更都更新 Swagger 文檔
- [ ] Commit message 遵循 Conventional Commits
- [ ] Code Review(若有團隊成員)
- [ ] 定期重構,避免技術債累積

#### 部署前
- [ ] 所有測試通過
- [ ] 效能測試達標
- [ ] 安全性檢查(OWASP Top 10)
- [ ] 跨瀏覽器測試(Chrome, Firefox, Safari, Edge)
- [ ] 手機裝置測試(iOS, Android)
- [ ] Lighthouse 評分 > 80
- [ ] 備份策略確認

---

## 總結

這份 PRD 完整規劃了一款展示 **Clean Architecture**、**微服務設計**、**分散式系統**能力的日本花牌遊戲。

### 核心亮點

1. **技術深度**
   - 採用 REST + SSE 混合架構,展示對不同通訊模式的理解
   - Clean Architecture 分層設計,易於測試與維護
   - 預留微服務化與分散式系統擴展路徑

2. **產品完整性**
   - 聚焦 MVP,實作玩家與對手對戰的核心體驗
   - 新手友善的 UI/UX 設計
   - 完整的遊戲規則與役種實作

3. **作品集價值**
   - 從前端到後端的完整技術棧展示
   - 可擴展的架構設計(單體 → 微服務 → 分散式)
   - 實際可玩的產品,非僅技術 Demo

### 修訂重點(v1.2)

本次修訂(v1.2)調整了以下內容:

1. ✅ **術語統一**:
   - 將所有「AI」改為「opponent」(對手)
   - 將所有「YAKO」改為「YAKU」(役種)
   - 將「移動」改為「行動」

2. ✅ **API 配對邏輯修正**:
   - 手牌配對:多張可配對時需玩家選擇,新增 `select-hand-match` API
   - 牌堆配對:系統自動處理,玩家無法選擇

3. ✅ **SSE 簡化**:
   - 提供清晰的事件類型列表
   - 移除詳細 payload 範例(實作時定義)

4. ✅ **移除範例程式碼與資料庫設計**:
   - 保留架構設計概念
   - 移除具體實作細節

### 建議開發順序

1. **Week 1**: 環境設定 + 基礎架構
2. **Week 2-3**: 核心遊戲邏輯(最重要)
3. **Week 3-4**: Use Case 與 API 實作
4. **Week 4-5**: SSE 整合與對手實作
5. **Week 5-6**: 前端 UI/UX 完善
6. **Week 6**: 整合測試與優化
7. **Week 7**: 測試與部署

### 成功關鍵

- ✅ 嚴格遵循 MVP 範圍,避免功能蔓延
- ✅ 重視測試,特別是核心業務邏輯
- ✅ 持續整合,早期發現問題
- ✅ 保持程式碼品質,為未來擴展打好基礎

