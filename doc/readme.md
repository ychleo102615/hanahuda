# 日本花牌 (Hanafuda Koi-Koi) 遊戲企劃書 (PRD)

---

## 文檔導航

### 核心文檔
- **專案概述** (本文檔)

### 共用定義
- [遊戲規則](./shared/game-rules.md) - 花札卡片、役種、計分規則
- [通訊協議](./shared/protocol.md) - 前後端交互規格（命令與事件）
- [數據契約](./shared/data-contracts.md) - 前後端共用的數據結構

### 前端架構
- [前端架構總覽](./frontend/architecture.md) - 前端技術棧與 BC 劃分
- **User Interface BC** (遊戲 UI 呈現層)
  - [Domain Layer](./frontend/user-interface/domain.md) - 卡片邏輯、配對驗證、役種檢測
  - [Application Layer](./frontend/user-interface/application.md) - SSE 事件處理 Use Cases
  - [Adapter Layer](./frontend/user-interface/adapter.md) - REST API 與 SSE 整合
- **Local Game BC** (離線單機遊戲)
  - [Domain Layer](./frontend/local-game/domain.md) - 完整遊戲引擎邏輯
  - [Application Layer](./frontend/local-game/application.md) - 離線遊戲 Use Cases
  - [Adapter Layer](./frontend/local-game/adapter.md) - 與 User Interface BC 的整合

### 後端架構
- [後端架構總覽](./backend/architecture.md) - 後端技術棧與微服務預備架構
- **Core Game BC** (核心遊戲服務)
  - [Domain Layer](./backend/core-game/domain.md) - Game Aggregate、遊戲規則引擎
  - [Application Layer](./backend/core-game/application.md) - 遊戲操作 Use Cases
  - [Adapter Layer](./backend/core-game/adapter.md) - REST API、SSE、JPA 持久化
- **Opponent BC** (對手策略)
  - [Domain Layer](./backend/opponent/domain.md) - 對手決策邏輯
  - [Application Layer](./backend/opponent/application.md) - 對手操作 Use Cases
  - [Adapter Layer](./backend/opponent/adapter.md) - 策略服務整合

### 質量保證
- [測試策略](./quality/testing-strategy.md) - 各層測試重點與覆蓋率目標
- [指標與標準](./quality/metrics.md) - 效能指標、程式碼品質標準

---

## 目錄

1. [專案概述](#1-專案概述)
2. [MVP 功能需求](#2-mvp-功能需求)
3. [非功能需求](#3-非功能需求)
4. [Clean Architecture 實踐指南](#4-clean-architecture-實踐指南)
5. [使用者體驗設計](#5-使用者體驗設計)
6. [未來擴展方向](#6-未來擴展方向)
7. [附錄](#7-附錄)

---

## 1. 專案概述

### 1.1 專案名稱
**Hanafuda Koi-Koi Web Game** (暫定)
- 語言：**英文**為主

### 1.2 專案目標
開發一款面向國際新手玩家的日本花牌網頁遊戲，採用現代化技術架構，展示 Clean Architecture、微服務、分散式系統設計能力。

### 1.3 核心價值主張
- **新手友善**: 清晰的規則說明與視覺引導
- **文化體驗**: 透過遊戲了解日本傳統花牌文化
- **技術展示**: 完整的前後端分離架構，展示可擴展的分散式系統設計

### 1.4 技術棧
- **前端**: Vue 3 + TypeScript + Tailwind CSS v4
- **後端**: Java (Spring Boot) + PostgreSQL
- **通訊**: REST API + Server-Sent Events (SSE)
- **架構**: Clean Architecture + Domain-Driven Design + 微服務預備架構

---

## 2. MVP 功能需求

### 2.1 首頁功能

#### Hero Section
- 遊戲標題與副標題
- 主要 CTA 按鈕：「開始遊戲」(Start Game)
- 視覺設計：傳統花牌意象融合現代設計風格

#### 規則介紹區
- Koi-Koi 基本規則說明
  - 遊戲目標
  - 牌組構成（12 個月份，每月 4 張，共 48 張）
  - 牌的分類（光札、種札、短冊、かす）
  - 基本役種介紹（12 種常用役種，詳見 [game-rules.md](./shared/game-rules.md)）
  - 遊戲流程說明
- 可折疊/展開的詳細說明

#### 美術資源版權聲明區
- 使用的花牌圖像來源聲明
- 開源授權資訊（Public Domain / CC BY-SA 4.0）
- 第三方資源 attribution

#### 導航列
- Logo / 遊戲名稱
- 導航連結：「規則」(Rules)、「關於」(About)、「開始遊戲」(Start Game)

---

### 2.2 遊戲頁面佈局

**遊戲介面固定 Viewport 設計**（100vh × 100vw，無垂直滾動）

```
┌─────────────────────────────────────────────────────────┐
│ 頂部資訊列 (~10-12% viewport)                            │
│ [對手分數: 0] [第 3 月] [玩家分數: 0] [玩家回合]          │
│ [新遊戲] [放棄] [規則] [遊戲記錄]                         │
├─────────────────────────────────────────────────────────┤
│ 對手已獲得牌區 (~15% viewport, 橫向滾動)                  │
│ ▢ ▢ ▢ ▢ ▢ ▢                                            │
├─────────────────────────────────────────────────────────┤
│ 場中央牌區 (~30% viewport, 核心區域)                      │
│              ▢ ▢ ▢ ▢                                     │
│              ▢ ▢ ▢ ▢                                     │
│ (8 張牌, 2 行 4 列固定網格排列)                            │
├─────────────────────────────────────────────────────────┤
│ 玩家已獲得牌區 (~15% viewport, 橫向滾動)                  │
│ ▢ ▢ ▢ ▢ ▢ ▢                                            │
├─────────────────────────────────────────────────────────┤
│ 玩家手牌區 (~25% viewport, 橫向排列)                      │
│ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢                                        │
└─────────────────────────────────────────────────────────┘
```

**響應式設計要點**:
- 各區塊高度比例固定，使用 Flexbox 垂直排列
- 手牌區與已獲得牌區允許橫向滾動
- 手機直向模式：場牌區改為 2 列 × 4 行，手牌區增加至 30% 高度

---

### 2.3 核心遊戲功能

#### 線上模式（與後端通訊）
- 透過 REST API 發送命令（加入遊戲、打牌、選擇配對、Koi-Koi 決策）
- 透過 SSE 接收遊戲事件（回合更新、役種形成、分數結算）
- 支援斷線重連（快照模式恢復完整狀態）
- 詳見 [protocol.md](./shared/protocol.md)

#### 離線模式（單機遊戲）
- 完整的遊戲引擎實作（發牌、配對、役種檢測、分數計算）
- 簡易隨機對手策略（MVP）
- 頁面重新載入後可恢復遊戲（可選）
- 詳見 [Local Game BC](./frontend/local-game/)

#### 視覺回饋與互動
- **可選狀態**: 手牌 hover 時輕微放大、陰影效果
- **選中狀態**: 選中的手牌明顯 highlight (如邊框發光)
- **配對提示**: 場上同月份的牌自動 highlight (邊框顏色變化)
- **配對動畫**: 配對成功時，牌飛向獲得區 (CSS transition)
- **役種特效**: 成立役種時，相關牌閃光或粒子效果
- **錯誤處理**: 提示「連線中斷，正在嘗試重連...」、「此操作無效」

---

## 3. 非功能需求

### 3.1 效能需求
- **API 回應時間**: < 500ms (P95)
- **遊戲狀態查詢**: < 200ms
- **SSE 事件推送延遲**: < 100ms
- **支援並發遊戲數**: 100+ (MVP 階段)
- **對手操作計算時間**: < 1 秒

詳見 [metrics.md](./quality/metrics.md)

### 3.2 可擴展性設計

**微服務預備架構**

MVP 階段採用單體應用，但設計上預留微服務化路徑：

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

**分散式系統考量**:
- **UUID 作為 Game ID**: 避免分散式環境 ID 衝突
- **遊戲狀態序列化**: 便於跨服務傳輸
- **事件驅動架構預留**: 遊戲事件可發布到訊息佇列
- **無狀態 API 設計**: 所有狀態存於資料庫，便於水平擴展
- **快取整合預留**: 減少 DB 查詢，支援 SSE 多實例

### 3.3 可維護性
- **Clean Architecture**: 嚴格分層（Domain、Application、Adapter）
- **單元測試覆蓋率**: 前端 > 70%、後端 > 80%（重點在核心業務邏輯）
- **API 文檔自動生成**: Swagger / OpenAPI 3.0
- **程式碼風格檢查**: ESLint / Checkstyle / SonarQube
- **Git Commit 規範**: Conventional Commits
- **Code Review**: Pull Request 必須經過 Review

### 3.4 安全性
- **CORS 設定**: 僅允許前端網域
- **API Rate Limiting** (預留): 可用 Redis + Bucket4j 實作
- **Input Validation**: Bean Validation (JSR-380) / Zod (TypeScript)
- **SQL Injection 防護**: 使用 JPA/Hibernate Prepared Statements
- **XSS 防護**: 前端 sanitize input，後端回傳適當的 Content-Type
- **HTTPS 強制**: 生產環境強制 HTTPS
- **敏感資料保護**: 密碼等使用環境變數，不寫入程式碼

### 3.5 可觀測性 (Observability)
- **日誌 (Logging)**: 使用 SLF4J + Logback (後端)、Console (前端)
  - 結構化日誌 (JSON format)
  - 不同層級 (INFO, WARN, ERROR)
- **監控 (Monitoring)** (預留):
  - Spring Boot Actuator
  - Prometheus + Grafana
- **追蹤 (Tracing)** (預留):
  - 分散式追蹤 (如 Zipkin)

---

## 4. Clean Architecture 實踐指南

### 4.1 架構分層概覽

本專案嚴格遵循 Clean Architecture 原則，將系統分為四個同心圓層次：

```
┌───────────────────────────────────────┐
│  Framework & Drivers (最外層)         │
│  ├─ Web (Spring MVC/Vue Router)       │
│  ├─ Database (JPA/IndexedDB)          │
│  └─ External APIs                     │
│                                       │
│  ┌──────────────────────────────────┐ │
│  │  Interface Adapters (適配層)     │ │
│  │  ├─ Controllers (REST/SSE)       │ │
│  │  ├─ Presenters (DTO Mappers)     │ │
│  │  ├─ Gateways (Repository Impl)   │ │
│  │  └─ View Models                  │ │
│  │                                  │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │  Application Business Rules │ │ │
│  │  │  (Use Cases 層)             │ │ │
│  │  │  ├─ 遊戲操作 Use Cases      │ │ │
│  │  │  ├─ 事件處理 Use Cases      │ │ │
│  │  │  └─ Port 介面定義           │ │ │
│  │  │                             │ │ │
│  │  │  ┌───────────────────────┐  │ │ │
│  │  │  │  Enterprise Business  │  │ │ │
│  │  │  │  Rules (Domain 層)    │  │ │ │
│  │  │  │  ├─ Aggregates        │  │ │ │
│  │  │  │  ├─ Entities          │  │ │ │
│  │  │  │  ├─ Value Objects     │  │ │ │
│  │  │  │  └─ Domain Services   │  │ │ │
│  │  │  └───────────────────────┘  │ │ │
│  │  └─────────────────────────────┘ │ │
│  └──────────────────────────────────┘ │
└───────────────────────────────────────┘
```

**依賴規則 (Dependency Rule)**:
- ✅ 依賴箭頭只能由外層指向內層
- ✅ 內層不依賴外層（Domain 不依賴 Adapter）
- ✅ 內層定義介面（Port），外層實作（Adapter）

### 4.2 各層職責

#### Domain Layer（企業業務規則層）
- 包含純粹的業務邏輯，不依賴任何框架
- 定義領域模型（Entity、Value Object、Aggregate）
- 實作業務規則（如配對規則、役種檢測）
- 定義 Repository 介面

**範例**：Game Aggregate、Card Value Object、YakuDetectionService

#### Application Layer（應用業務規則層）
- 編排領域對象完成特定用例（Use Case）
- 定義輸入/輸出 Port 介面
- 不包含業務邏輯，只負責協調

**範例**：PlayHandCardUseCase、HandleGameStartedUseCase

#### Adapter Layer（介面適配層）
- 實作 Application Layer 定義的 Port 介面
- 處理外部技術細節（REST、資料庫、SSE）
- 轉換資料格式（Domain ↔ DTO）

**範例**：REST Controllers、SSE Client、Repository Adapters

### 4.3 Bounded Context 劃分

本專案採用 Domain-Driven Design，將系統劃分為以下 Bounded Contexts：

#### 前端
- **User Interface BC**: 遊戲 UI 呈現層（卡片顯示、動畫、使用者操作）
- **Local Game BC**: 離線單機遊戲引擎（完整遊戲邏輯）

#### 後端
- **Core Game BC**: 核心遊戲服務（遊戲會話、規則引擎、事件推送）
- **Opponent BC**: 對手策略服務（決策邏輯）

詳見 [前端架構總覽](./frontend/architecture.md) 與 [後端架構總覽](./backend/architecture.md)

---

## 5. 使用者體驗設計

### 5.1 視覺設計方向

**設計風格**: 傳統與現代融合

- **色彩方案**:
  - 主色: 深紅 (#C41E3A) - 象徵日本傳統
  - 輔色: 金色 (#D4AF37)、墨綠 (#2C5F2D)
  - 背景: 米白 (#F5F5DC)、深灰 (#2B2B2B)
- **字體**:
  - 標題: 使用優雅的襯線字體（如 Noto Serif）
  - 內文: 清晰的無襯線字體（如 Inter, Noto Sans）
  - 牌名: 日文字體（如 Noto Sans JP）

**牌面設計**:
- 使用傳統花牌圖案（公有領域或開源資源）
- 適當放大重要牌（光札、種札）
- 高對比度，確保可辨識性

### 5.2 互動流程

**新手引導**:
1. 首頁展示吸引人的 Hero Section
2. 規則區塊提供清晰的圖文說明
3. 第一次遊戲時，提供「教學模式」(可選，Post-MVP)

**遊戲進行**:
1. 玩家選牌 → 高亮可配對牌 → 確認選擇
2. 動畫流暢，反饋即時
3. 役種達成時，特效明顯，文字清晰
4. 對手操作時，顯示「對手思考中」，避免使用者困惑

---

## 6. 未來擴展方向

### 使用者系統與社交功能 (Post-MVP)

**帳號系統**
- 使用者註冊與登入（JWT Authentication）
- 個人資料管理
- 遊戲歷史記錄
- 統計數據（勝率、常用役種等）

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

### 多人對戰與進階功能

**多人對戰**
- 配對系統（Matchmaking）
- 即時對戰（WebSocket）
- 觀戰功能
- 重播系統

**進階對手策略**
- 多種難度等級（簡單、中等、困難）
- 策略型對手（不只是隨機）
- 對手個性化（不同風格）

**自訂規則**
- 可調整役種分數
- 啟用/停用特定役種
- 自訂遊戲時長

---

### 系統優化與分散式架構

**微服務拆分**
- Game Service
- User Service
- Matchmaking Service
- Opponent Service
- Analytics Service

**分散式系統技術**
- 事件驅動架構（Kafka / RabbitMQ）
- 分散式快取（Redis Cluster）
- 資料庫分片（Sharding）
- 負載平衡（Nginx / HAProxy）

**可觀測性提升**
- 分散式追蹤（Zipkin / Jaeger）
- 集中式日誌（ELK Stack）
- 監控儀表板（Grafana + Prometheus）

---

### 擴展遊戲內容

**多語言支援**
- 日文、中文（繁體/簡體）
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

## 7. 附錄

### 7.1 花牌基礎資料

參考 [卡片列表](./shared/game-rules.md#卡片列表)

---

### 7.2 參考資源

#### 規則參考
- [Koi-Koi - Wikipedia (EN)](https://en.wikipedia.org/wiki/Koi-Koi)
- [Hanafuda - Fuda Wiki](https://fudawiki.org/en/hanafuda/games/koi-koi)
- [Japanese Hanafuda Guide](https://www.hanafudahawaii.com/)
- [Nintendo 官方](https://www.nintendo.com/jp/others/hanafuda_kabufuda/howtoplay/koikoi/index.html)

#### 開源花牌圖檔資源
- **Hanafuda cards on Wikimedia Commons** (Public Domain)
  - https://commons.wikimedia.org/wiki/Category:Hanafuda
- **dotty-dev/Hanafuda-Louie-Recolor** (CC BY-SA 4.0)
  - https://github.com/dotty-dev/Hanafuda-Louie-Recolor
- **自製選項**: 使用 Illustrator / Figma 重繪傳統圖案

#### 技術文檔
- **Clean Architecture** - Robert C. Martin
- **Domain-Driven Design** - Eric Evans
- **Spring Boot Documentation** - https://spring.io/projects/spring-boot
- **Vue 3 Documentation** - https://vuejs.org/
- **Server-Sent Events (MDN)** - https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

---

## 總結

這份 PRD 完整規劃了一款展示 **Clean Architecture**、**微服務設計**、**分散式系統**能力的日本花牌遊戲。

### 核心亮點

1. **技術深度**
   - 採用 REST + SSE 混合架構，展示對不同通訊模式的理解
   - Clean Architecture 分層設計，易於測試與維護
   - 預留微服務化與分散式系統擴展路徑

2. **產品完整性**
   - 聚焦 MVP，實作玩家與對手對戰的核心體驗
   - 新手友善的 UI/UX 設計
   - 完整的遊戲規則與役種實作

3. **作品集價值**
   - 從前端到後端的完整技術棧展示
   - 可擴展的架構設計（單體 → 微服務 → 分散式）
   - 實際可玩的產品，非僅技術 Demo

### 建議開發順序

1. **Week 1**: 環境設定 + 基礎架構
2. **Week 2-3**: 核心遊戲邏輯（Domain Layer）
3. **Week 3-4**: Use Case 與 API 實作
4. **Week 4-5**: SSE 整合與對手實作
5. **Week 5-6**: 前端 UI/UX 完善
6. **Week 6**: 整合測試與優化
7. **Week 7**: 測試與部署

### 成功關鍵

- ✅ 嚴格遵循 MVP 範圍，避免功能蔓延
- ✅ 重視測試，特別是核心業務邏輯
- ✅ 持續整合，早期發現問題
- ✅ 保持程式碼品質，為未來擴展打好基礎
