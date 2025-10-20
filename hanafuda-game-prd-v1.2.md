# 日本花牌(Hanafuda Koi-Koi)遊戲企劃書 (PRD)

**版本**: 1.2  
**最後更新**: 2025-10-20  
**通訊方案**: REST + SSE (Server-Sent Events)  
**修訂說明**: 
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
- **架構**:Clean Architecture + Microservices-ready design

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

**響應式設計**

```css
/* 示意性 CSS 架構 */
.game-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header-info {
  flex: 0 0 10%;
  min-height: 80px;
}

.opponent-captured-area {
  flex: 0 0 15%;
  overflow-x: auto;
  overflow-y: hidden;
}

.field-cards-area {
  flex: 0 0 30%;
  display: grid;
  grid-template-rows: repeat(2, 1fr);
  grid-template-columns: repeat(4, 1fr);
}

.player-captured-area {
  flex: 0 0 15%;
  overflow-x: auto;
  overflow-y: hidden;
}

.player-hand-area {
  flex: 0 0 25%;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 手機直向模式調整 */
@media (max-width: 768px) and (orientation: portrait) {
  .field-cards-area {
    flex: 0 0 25%;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(4, 1fr);
  }
  
  .player-hand-area {
    flex: 0 0 30%;
    overflow-x: auto;
  }
}
```

---

#### 2.1.3 核心遊戲功能

**1. 開始新遊戲**
- 點擊「新遊戲」按鈕
- 呼叫後端 API:`POST /api/v1/games`
- 接收遊戲初始狀態(DTO 格式,見 5.3 節)
- 建立 SSE 連接:`/api/v1/games/{gameId}/events`
- 渲染初始牌面配置

**2. 遊戲進行流程**

**玩家回合**:

**步驟 1: 從手牌出牌**
1. 從手牌選擇一張牌(點擊)
2. 系統自動 highlight 場上同月份的牌
3. 發送行動到後端:`POST /api/v1/games/{gameId}/actions/play-hand-card`
4. 若有配對選項:
   - **單一配對**:後端自動配對,無需玩家選擇
   - **多重配對**:後端返回可配對的場牌列表,前端顯示選項,玩家選擇其中一張
   - 玩家選擇後,發送:`POST /api/v1/games/{gameId}/actions/select-hand-match`
5. 若無配對:牌自動放置到場中

**步驟 2: 從牌堆翻牌**
6. 系統自動從牌堆翻開一張牌(由後端處理)
7. 若翻開的牌有多張可配對:
   - **系統自動配對**(玩家無法選擇,後端邏輯處理)
8. 若無配對:牌自動放置到場中

**對手回合**(透過 SSE 接收):
1. 接收 `OPPONENT_TURN_START` 事件 → 顯示「對手回合開始」
2. 接收 `OPPONENT_THINKING` 事件 → 顯示「對手思考中...」
3. 接收 `OPPONENT_ACTION` 事件 → 播放對手行動動畫
4. 接收 `YAKU_DETECTED` 事件(若有) → 顯示役種達成特效
5. 接收 `OPPONENT_KOIKOI_DECISION` 事件(若對手成立役種) → 顯示對手決策
6. 接收 `TURN_CHANGED` 事件 → 切換回玩家回合

**役種檢測與 Koi-Koi 決策**:
- **檢測時機**:每次「回合結束前」進行役種檢測
  - 玩家出牌 + 翻牌堆完成後,檢測玩家已獲得牌
  - 對手行動完成後,檢測對手已獲得牌
- 當玩家或對手成立役種時
- 顯示役種名稱與分數
- 若玩家成立役種,顯示「こいこい」或「勝負」選項
  - 「こいこい」:繼續遊戲,追求更高分數(有風險)
  - 「勝負」:結束遊戲,確定當前分數
- 對手的決策由後端邏輯處理

**3. 放棄/離開遊戲**
- 點擊「放棄遊戲」按鈕
- 顯示確認對話框
- 呼叫 API:`POST /api/v1/games/{gameId}/surrender`
- 關閉 SSE 連接
- 顯示遊戲結果或返回首頁

**4. 遊戲結束**
- 接收 `GAME_OVER` SSE 事件
- 顯示結果畫面:
  - 勝者(玩家/對手/平手)
  - 最終分數
  - 成立的役種列表
  - [再來一局] 和 [返回首頁] 按鈕

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

#### 2.2.1 REST API 設計

**基礎路徑**: `/api/v1`

##### API 端點列表

```
POST   /api/v1/games                                    # 創建新遊戲
GET    /api/v1/games/{gameId}                           # 查詢遊戲狀態(用於重連)
POST   /api/v1/games/{gameId}/actions/play-hand-card    # 玩家從手牌出牌
POST   /api/v1/games/{gameId}/actions/select-hand-match # 玩家選擇手牌配對(多重配對時)
POST   /api/v1/games/{gameId}/koikoi                    # Koi-Koi 決策
POST   /api/v1/games/{gameId}/surrender                 # 放棄遊戲
GET    /api/v1/games/{gameId}/events                    # SSE 事件流
```

##### API 詳細規格
待定

---

#### 2.2.2 Server-Sent Events (SSE) 設計

**SSE 端點**

```http
GET /api/v1/games/{gameId}/events?lastEventId=41
Accept: text/event-stream

Response: 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Query Parameter**:
- `lastEventId` (optional): 用於斷線重連,請求此序號之後的事件

---

**SSE 事件類型列表**

所有 SSE 事件都包含以下標準格式:
```
id: <序號>
event: <事件類型>
data: <JSON payload>
```

**事件類型清單**:

| 事件類型 | 說明 | 觸發時機 |
|---------|------|---------|
| `OPPONENT_TURN_START` | 對手回合開始 | 玩家行動完成,切換到對手回合 |
| `OPPONENT_THINKING` | 對手思考中 | 對手開始計算下一步行動 |
| `OPPONENT_ACTION` | 對手執行行動 | 對手完成一次完整行動(手牌+牌堆) |
| `YAKU_DETECTED` | 役種檢測 | 玩家或對手成立役種 |
| `OPPONENT_KOIKOI_DECISION` | 對手 Koi-Koi 決策 | 對手成立役種後的決策 |
| `TURN_CHANGED` | 回合切換 | 回合從對手切換回玩家 |
| `GAME_OVER` | 遊戲結束 | 遊戲因任何原因結束 |
| `ERROR` | 錯誤事件 | 發生錯誤 |

**事件 Payload 結構**
待定

---

#### 2.2.3 核心業務邏輯

**遊戲規則服務 (GameRuleService)**
- 驗證行動合法性
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

MVP 需實作的役種:

| 役種名稱 | 日文 | 分數 | 說明 |
|---------|------|------|------|
| 五光 | 五光 (Gokō) | 15 | 5張光札全收集 |
| 四光 | 四光 (Shikō) | 10 | 4張光札(不含柳小野道風) |
| 雨四光 | 雨四光 (Ame-Shikō) | 8 | 4張光札(含柳小野道風) |
| 三光 | 三光 (Sankō) | 6 | 3張光札(不含柳小野道風) |
| 花見酒 | 花見酒 (Hanami-zake) | 5 | 櫻幕 + 菊酒杯 |
| 月見酒 | 月見酒 (Tsukimi-zake) | 5 | 芒月 + 菊酒杯 |
| 赤短 | 赤短 (Aka-tan) | 5 | 松短、梅短、櫻短(紅色書法短冊) |
| 青短 | 青短 (Ao-tan) | 5 | 牡丹短、菊短、楓短(藍色書法短冊) |
| 豬鹿蝶 | 猪鹿蝶 (Ino-Shika-Chō) | 5 | 萩豬 + 楓鹿 + 牡丹蝶 |
| タネ | タネ (Tane) | 1 | 5張以上種札,每多1張+1分 |
| タン | タン (Tan) | 1 | 5張以上短冊,每多1張+1分 |
| カス | カス (Kasu) | 1 | 10張以上素札,每多1張+1分 |

**對手策略 (OpponentStrategy)**

MVP 實作簡易策略:
- 從手牌隨機選擇一張牌
- 若有多張可配對場牌,隨機選擇一張
- 牌堆翻牌的配對由系統自動處理
- Koi-Koi 決策:簡單策略(如低分繼續,高分停止)

---

## 3. 非功能需求

### 3.1 效能需求
- **API 回應時間**: < 500ms (P95)
- **遊戲狀態查詢**: < 200ms
- **SSE 事件推送延遲**: < 100ms
- **支援並發遊戲數**: 100+ (MVP 階段)
- **對手行動計算時間**: < 1 秒

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
- **SSE**: 處理 Server 主動推送事件(對手行動、遊戲狀態更新)

**為什麼選擇 SSE?**

相較於其他方案:

| 方案 | 優點 | 缺點 | 適用場景 |
|------|------|------|----------|
| **短輪詢** | 實作簡單 | 頻繁請求浪費資源 | 對即時性要求低 |
| **長輪詢** | 減少無效請求 | Server 資源佔用高 | 過渡方案 |
| **SSE** | Server 主動推送、自動重連、基於 HTTP | 單向通訊 | Server → Client 事件流 |
| **WebSocket** | 雙向通訊、低延遲 | 複雜度高、需要額外管理 | 即時多人互動 |

**MVP 採用 SSE 的理由**:
1. ✅ 滿足 Server 主動推送需求(對手行動、遊戲事件)
2. ✅ 實作簡單,Spring 原生支援
3. ✅ 自動重連機制
4. ✅ 適合單向事件流(Server → Client)
5. ✅ 易於測試與除錯
6. ✅ 未來可平滑升級到 WebSocket(多人對戰時)

### 4.2 通訊流程圖

**完整遊戲流程**

```
1. 創建遊戲
   Frontend → POST /api/v1/games → Backend
                                 ← 201 Created {gameId, gameState}

2. 建立 SSE 連接
   Frontend → GET /api/v1/games/{gameId}/events → Backend
                                                 ← SSE Stream

3. 玩家出牌
   Frontend → POST /api/v1/games/{gameId}/actions/play-hand-card → Backend
                                                                  ← 200 OK (可能需要選擇配對)
   
   [如果需要選擇配對]
   Frontend → POST /api/v1/games/{gameId}/actions/select-hand-match → Backend
                                                                     ← 200 OK
   
   Backend → SSE: OPPONENT_TURN_START → Frontend
   Backend → SSE: OPPONENT_THINKING → Frontend
   Backend → SSE: OPPONENT_ACTION → Frontend
   Backend → SSE: YAKU_DETECTED (if any) → Frontend
   Backend → SSE: OPPONENT_KOIKOI_DECISION (if yaku) → Frontend
   Backend → SSE: TURN_CHANGED → Frontend

4. Koi-Koi 決策(當玩家成立役種)
   Frontend → POST /api/v1/games/{gameId}/koikoi → Backend
                                                  ← 200 OK
   
   Backend → SSE: GAME_CONTINUES or GAME_OVER → Frontend

5. 遊戲結束
   Backend → SSE: GAME_OVER → Frontend

6. 放棄遊戲
   Frontend → POST /api/v1/games/{gameId}/surrender → Backend
                                                     ← 200 OK {gameResult}
   
   Frontend → Close SSE connection
```

### 4.3 SSE 容錯與重連設計

**斷線重連機制**

SSE 原生支援自動重連,但需要應用層面的支援以確保狀態一致性。

#### 4.3.1 事件序號機制

**目的**: 避免事件重複或遺漏

- 每個 SSE 事件都帶有遞增的 `id` 欄位(序號)
- 後端維護每個遊戲的事件序號計數器
- 所有事件持久化到資料庫

**範例**:
```
id: 42
event: OPPONENT_THINKING
data: {"timestamp":"2025-10-19T10:30:01Z"}

id: 43
event: OPPONENT_ACTION
data: {...}
```

#### 4.3.2 重連流程

**前端處理要點**:
- 記錄最後收到的事件 ID (`lastEventId`)
- 連線錯誤時,使用指數退避策略重連(1s, 2s, 4s, 8s, 16s, 最大 30s)
- 重連時帶上 `lastEventId` 參數,後端補發錯過的事件
- 達到最大重連次數後,提示使用者重新整理頁面
- 可選:實作 Fallback 短輪詢機制

**後端處理要點**:
- 接收 `lastEventId` 參數時,先發送錯過的事件
- 然後訂閱即時事件流
- 合併歷史事件和即時事件推送給客戶端

#### 4.3.3 Fallback 機制(短輪詢)

**觸發條件**:
- SSE 連線持續失敗超過最大重連次數
- 偵測到客戶端環境不支援 SSE

**實作方式**:
- 使用定時器(如每 2 秒)輪詢 `GET /api/v1/games/{gameId}` 獲取最新狀態
- 比較狀態變化,更新前端顯示
- 遊戲結束時停止輪詢

#### 4.3.4 重連策略總結

```
1. 偵測斷線
   ↓
2. 自動重連(指數退避: 1s, 2s, 4s, 8s, 16s, 最大 30s)
   ↓
3. 使用 lastEventId 請求錯過的事件
   ↓
4. 若連續失敗 5 次:
   - 提示使用者「連線不穩定」
   - 呼叫 GET /api/v1/games/{gameId} 重新載入完整狀態
   - 切換到 Fallback 短輪詢模式(optional)
```

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

### 5.3 DTO 與 Domain Model 轉換

**轉換原則**:
- API 層永遠使用 DTO,不暴露 Domain Model
- DTO 是扁平化的資料結構,便於序列化
- Domain Model 包含業務邏輯與不變性約束
- 轉換發生在 Adapter Layer(使用 Mapper/Presenter)

**DTO 範例**:

```java
// API Response DTO
public class GameStateDTO {
    private int currentMonth;
    private String currentTurn;  // "PLAYER" or "OPPONENT"
    private List<CardDTO> playerHand;
    private List<CardDTO> fieldCards;
    private int deckRemaining;
    private int playerScore;
    private int opponentScore;
    private int playerCapturedCount;
    private int opponentCapturedCount;
}

public class CardDTO {
    private int month;
    private String type;
    private String cardId;
    private String displayName;
}
```

**Domain Model 範例**:

```java
// Domain Model - 包含業務邏輯
public class Card {
    private final CardId id;
    private final Month month;
    private final CardType type;
    private final String displayName;
    
    // 業務邏輯方法
    public boolean canMatchWith(Card other) {
        return this.month.equals(other.month);
    }
    
    public boolean isHikari() {
        return this.type == CardType.HIKARI;
    }
}
```

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
4. 對手行動時,顯示「對手思考中」,避免使用者困惑

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
- [ ] 實作役種檢測服務(YakuDetector)
  - [ ] 光札系役種
  - [ ] 特殊役種(花見酒、月見酒、豬鹿蝶)
  - [ ] 短冊系役種
  - [ ] タネ/タン/カス 役種

**單元測試**
- [ ] Card 測試
- [ ] Deck 測試
- [ ] GameState 測試
- [ ] YakuDetector 測試(所有 12 種役種)

---

### Phase 3: Use Case 與 API 實作 (Week 3-4)

**Application Layer**
- [ ] CreateGameUseCase
- [ ] PlayHandCardUseCase
- [ ] SelectHandMatchUseCase
- [ ] ExecuteOpponentActionUseCase
- [ ] MakeKoikoiDecisionUseCase
- [ ] SurrenderGameUseCase

**Adapter Layer - REST API**
- [ ] POST /api/v1/games
- [ ] GET /api/v1/games/{gameId}
- [ ] POST /api/v1/games/{gameId}/actions/play-hand-card
- [ ] POST /api/v1/games/{gameId}/actions/select-hand-match
- [ ] POST /api/v1/games/{gameId}/koikoi
- [ ] POST /api/v1/games/{gameId}/surrender

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
- [ ] 所有役種檢測驗證
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
| 遊戲節奏過慢 | 中 | 中 | 對手行動動畫可加速;提供「快速模式」 |
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
- [ ] 所有 12 種役種正確檢測
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

#### 12 個月份與對應花卉

| 月份 | 日文 | 羅馬拼音 | 花卉 | 說明 |
|------|------|----------|------|------|
| 1月 | 松 | Matsu | Pine | 象徵長壽 |
| 2月 | 梅 | Ume | Plum Blossom | 早春之花 |
| 3月 | 櫻 | Sakura | Cherry Blossom | 日本國花 |
| 4月 | 藤 | Fuji | Wisteria | 優雅之花 |
| 5月 | 菖蒲 | Ayame | Iris | 端午節花 |
| 6月 | 牡丹 | Botan | Peony | 富貴之花 |
| 7月 | 萩 | Hagi | Bush Clover | 秋之七草 |
| 8月 | 芒 | Susuki | Pampas Grass | 中秋賞月 |
| 9月 | 菊 | Kiku | Chrysanthemum | 皇室象徵 |
| 10月 | 楓 | Momiji | Maple | 紅葉季節 |
| 11月 | 柳 | Yanagi | Willow | 雨中之柳 |
| 12月 | 桐 | Kiri | Paulownia | 高貴之樹 |

---

#### 48 張牌完整列表

**光札 (Hikari) - 5 張**

| 牌名 | 月份 | Card ID |
|------|------|---------|
| 松鶴 | 1月 | matsu-tsuru |
| 櫻幕 | 3月 | sakura-maku |
| 芒月 | 8月 | susuki-tsuki |
| 柳小野道風 | 11月 | yanagi-ono |
| 桐鳳凰 | 12月 | kiri-ho-o |

---

**種札 (Tane) - 9 張**

| 牌名 | 月份 | Card ID |
|------|------|---------|
| 梅鶯 | 2月 | ume-uguisu |
| 藤杜鵑 | 4月 | fuji-hototogisu |
| 菖蒲八橋 | 5月 | ayame-yatsuhashi |
| 牡丹蝶 | 6月 | botan-cho |
| 萩豬 | 7月 | hagi-inoshishi |
| 芒雁 | 8月 | susuki-kari |
| 菊盃 | 9月 | kiku-sakazuki |
| 楓鹿 | 10月 | momiji-shika |
| 柳燕 | 11月 | yanagi-tsubame |

**注意**: 8 月(芒)有光札(芒月)和種札(芒雁),不是 3 張カス。

---

**短冊 (Tanzaku) - 10 張**

| 類型 | 牌名 | 月份 | Card ID |
|------|------|------|---------|
| 赤短 | 松短 | 1月 | matsu-tanzaku |
| 赤短 | 梅短 | 2月 | ume-tanzaku |
| 赤短 | 櫻短 | 3月 | sakura-tanzaku |
| 藤短 | 藤短 | 4月 | fuji-tanzaku |
| 菖蒲短 | 菖蒲短 | 5月 | ayame-tanzaku |
| 青短 | 牡丹短 | 6月 | botan-tanzaku |
| 萩短 | 萩短 | 7月 | hagi-tanzaku |
| 青短 | 菊短 | 9月 | kiku-tanzaku |
| 青短 | 楓短 | 10月 | momiji-tanzaku |
| 柳短 | 柳短 | 11月 | yanagi-tanzaku |

---

**カス (Kasu/素札) - 24 張**

每月 2 張カス,共 24 張。部分月份的命名範例:

| 月份 | Card ID 範例 |
|------|--------------|
| 1月 | matsu-kasu-1, matsu-kasu-2 |
| 2月 | ume-kasu-1, ume-kasu-2 |
| 3月 | sakura-kasu-1, sakura-kasu-2 |
| 4月 | fuji-kasu-1, fuji-kasu-2 |
| 5月 | ayame-kasu-1, ayame-kasu-2 |
| 6月 | botan-kasu-1, botan-kasu-2 |
| 7月 | hagi-kasu-1, hagi-kasu-2 |
| 8月 | susuki-kasu-1, susuki-kasu-2 |
| 9月 | kiku-kasu-1, kiku-kasu-2 |
| 10月 | momiji-kasu-1, momiji-kasu-2 |
| 11月 | yanagi-kasu-1, yanagi-kasu-2 |
| 12月 | kiri-kasu-1, kiri-kasu-2 |

**總計**: 5 + 9 + 10 + 24 = 48 張牌

---

### 11.2 役種詳細說明

#### 光札系役種

**五光 (Gokō)** - 15 分
- 條件:收集全部 5 張光札
- 牌組:松鶴、櫻幕、芒月、柳小野道風、桐鳳凰

**四光 (Shikō)** - 10 分
- 條件:收集 4 張光札(不含柳小野道風)
- 牌組:松鶴、櫻幕、芒月、桐鳳凰

**雨四光 (Ame-Shikō)** - 8 分
- 條件:收集 4 張光札(含柳小野道風)
- 牌組:任意 4 張光札(包含柳小野道風)

**三光 (Sankō)** - 6 分
- 條件:收集 3 張光札(不含柳小野道風)
- 牌組:松鶴、櫻幕、芒月 或其他組合

---

#### 特殊役種

**花見酒 (Hanami-zake)** - 5 分
- 條件:櫻幕 + 菊盃
- 意義:賞櫻飲酒

**月見酒 (Tsukimi-zake)** - 5 分
- 條件:芒月 + 菊盃
- 意義:賞月飲酒

**豬鹿蝶 (Ino-Shika-Chō)** - 5 分
- 條件:萩豬 + 楓鹿 + 牡丹蝶
- 意義:日本傳統吉祥組合

---

#### 短冊系役種

**赤短 (Aka-tan)** - 5 分
- 條件:松短、梅短、櫻短(3 張紅色書法短冊)

**青短 (Ao-tan)** - 5 分
- 條件:牡丹短、菊短、楓短(3 張藍色書法短冊)

**タン (Tan)** - 1 分起
- 條件:收集 5 張以上短冊
- 計分:5 張 = 1 分,每多 1 張 +1 分

---

#### 種札與カス役種

**タネ (Tane)** - 1 分起
- 條件:收集 5 張以上種札
- 計分:5 張 = 1 分,每多 1 張 +1 分

**カス (Kasu)** - 1 分起
- 條件:收集 10 張以上素札
- 計分:10 張 = 1 分,每多 1 張 +1 分

---

### 11.3 參考資源

#### 規則參考
- [Koi-Koi - Wikipedia (EN)](https://en.wikipedia.org/wiki/Koi-Koi)
- [Hanafuda - Fuda Wiki](https://fudawiki.org/en/hanafuda/games/koi-koi)
- [Japanese Hanafuda Guide](https://www.hanafudahawaii.com/)

#### 開源花牌圖檔資源
- **Hanafuda cards on Wikimedia Commons** (Public Domain)
  - https://commons.wikimedia.org/wiki/Category:Hanafuda
- **louislam/hanafuda-svg** (MIT License)
  - https://github.com/louislam/hanafuda-svg
- **自製選項**:使用 Illustrator / Figma 重繪傳統圖案

#### 技術文檔
- **Clean Architecture** - Robert C. Martin
- **Domain-Driven Design** - Eric Evans
- **Spring Boot Documentation** - https://spring.io/projects/spring-boot
- **Vue 3 Documentation** - https://vuejs.org/
- **Server-Sent Events (MDN)** - https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

---

### 11.4 開發檢查清單

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

---

**祝你開發順利!這個專案將會是你轉型後端工程師的絕佳展示作品。** 🎴✨
