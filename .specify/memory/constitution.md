<!--
Sync Impact Report:
─────────────────────────────────────────────────────────────────────────────
Version Change: 1.2.0 → 1.3.0
Change Type: Minor amendment (modified testing scope + updated tech stack)
Modified Principles:
  - Principle V: Test-First Development - Narrowed strict TDD scope to Domain and
    Application Layers only. Adapter Layer (including Vue components, composables,
    views) explicitly exempted from strict testing requirements.

Modified Sections:
  - 架構約束 > 技術棧（固定）→ 技術棧 - Updated to reflect Nuxt 4 for frontend
    and flexible backend options (Nuxt or Java Spring Boot)

Rationale:
  - Domain and Application Layers contain core business logic requiring rigorous testing
  - Adapter Layer (Vue ecosystem: components, composables, views) is integration code
    that changes frequently with UI requirements and framework updates
  - Strict testing for Adapter Layer provides diminishing returns vs. implementation cost
  - Tech stack update reflects current project direction with Nuxt 4 migration

Templates Status:
  ✅ plan-template.md: No changes needed (already references constitution for gates)
  ✅ spec-template.md: No changes needed
  ✅ tasks-template.md: No changes needed (test phases remain optional per spec)

Follow-up TODOs:
  - None
─────────────────────────────────────────────────────────────────────────────
-->

# Hanafuda Koi-Koi 專案憲法

## 核心原則

### I. Clean Architecture (NON-NEGOTIABLE)

**所有程式碼必須遵循 Clean Architecture 原則，採用嚴格分層架構：**

- **Domain Layer**: 純業務邏輯，零框架依賴，定義 Repository 介面
- **Application Layer**: Use Cases 編排 Domain 物件，定義 Port 介面
- **Adapter Layer**: 實作 Ports，處理外部關注點（REST、SSE、資料庫、DTOs）

**依賴規則**: 依賴必須只能指向內層（Adapter → Application → Domain）。內層不得依賴外層。

**理由**: 此架構確保可測試性、可維護性，並能在未來進行微服務拆分時無需重寫核心業務邏輯。

---

### II. Domain-Driven Development (NON-NEGOTIABLE)

**每個 Bounded Context 必須：**

- 明確識別並建模 Aggregates、Entities、Value Objects
- 使用問題領域的通用語言（ubiquitous language）（例如："Card"、"Yaku"、"Koi-Koi"，而非 "Data"、"Record"）
- 定義清晰的 Bounded Context 邊界（前端與後端之間，以及未來的微服務之間）
- 將業務規則保留在 Domain Layer，不放在 Controllers 或 Services 中

**當前 Bounded Contexts**:
- **前端**:
  - User Interface BC（遊戲 UI 呈現層）
  - Local Game BC（離線單機遊戲引擎）
- **後端**:
  - Core Game BC（核心遊戲服務）
  - Opponent BC（對手策略服務）

**未來 Contexts**: User Service、Matchmaking Service、Analytics Service

**理由**: DDD 確保程式碼庫反映真實世界的遊戲領域，讓開發人員和領域專家都能理解。

---

### III. Server Authority (NON-NEGOTIABLE)

**所有遊戲邏輯、狀態、驗證必須存在於伺服器端：**

- 伺服器是遊戲狀態的唯一真相來源（single source of truth）
- 客戶端發送命令（REST API），伺服器推送事件（SSE）
- 客戶端不得執行遊戲規則驗證或狀態計算
- 前端僅根據 SSE 事件渲染狀態

**例外條款（UI 提示驗證）**:
- 允許客戶端執行**僅用於即時 UI 反饋**的驗證邏輯（例如：高亮可配對卡片、顯示役種進度提示）
- 此類驗證邏輯**不得**作為最終驗證權威，伺服器必須重新驗證所有操作
- 客戶端驗證結果**不得**影響遊戲狀態，僅用於改善使用者體驗
- 若前後端驗證邏輯不一致，以伺服器為準

**理由**: 防止作弊、確保跨客戶端一致性、簡化客戶端邏輯、支援未來多人遊戲。即時 UI 反饋可改善使用者體驗但不影響遊戲公平性。

---

### IV. Command-Event Architecture

**通訊必須遵循 Command-Event 模式：**

- **Commands**（客戶端 → 伺服器）: REST API 請求（例如：`TurnPlayHandCard`、`RoundMakeDecision`）
- **Events**（伺服器 → 客戶端）: SSE 推送通知（例如：`CardPlayedFromHand`、`TurnYakuFormed`）
- 所有事件必須是原子性、最小化的，並包含 `event_id` 序列號
- 事件必須嚴格遵循 `doc/shared/protocol.md` 中的規範

**理由**: 解耦客戶端與伺服器、支援事件溯源（event sourcing）、支援未來事件驅動的微服務架構。

---

### V. Test-First Development (NON-NEGOTIABLE)

**僅 Domain 和 Application Layers 必須遵循嚴格 TDD：**

- 撰寫測試 → 獲得使用者/規格批准 → 測試失敗 → 實作
- 嚴格執行 Red-Green-Refactor 循環
- Domain Layer 單元測試覆蓋率必須超過 80%
- Application Layer 整合測試覆蓋率必須超過 70%

**Adapter Layer 測試範圍（非強制）**:
- Adapter Layer 屬於整合層，**無需嚴格測試**
- Vue 生態系中的所有元件皆屬於 Adapter Layer，包括：
  - Vue Components（views、components）
  - Composables（所有 use* 函數）
  - Pinia Stores
  - API Clients
  - Router Guards
- Adapter Layer 測試為**選擇性**，可根據需求補充

**測試類別**:
- **單元測試（必須）**: Domain 模型、業務規則（例如：配對邏輯、役種檢測）
- **整合測試（必須）**: Use Cases 與 mocked repositories
- **契約測試（建議）**: REST API endpoints、SSE 事件結構
- **E2E 測試（可選）**: 完整遊戲流程驗證
- **Adapter 測試（可選）**: Vue 元件、composables、stores

**理由**: Domain 和 Application Layers 包含核心業務邏輯，必須確保正確性。Adapter Layer 為整合層，變更頻繁且與框架緊密耦合，嚴格測試的投資報酬率較低。

---

### VI. Bounded Context Isolation

**每個 Bounded Context 必須：**

- 維護自己的 Domain Model（不在 BC 邊界間共用 Domain 物件）
- 透過明確定義的契約進行通訊（REST API、SSE 事件，如 `doc/shared/protocol.md` 定義）
- 使用 DTOs 進行所有跨邊界通訊（絕不直接暴露 Domain Models）
- 包含 `mapper` 組件來轉換 Domain Models 與 DTOs

**當前 BCs**:

**前端（Nuxt 4 + Vue 3 + TypeScript）**:
- **User Interface BC**: 遊戲 UI 呈現層
  - Domain: 卡片邏輯、配對驗證、役種檢測（純函數）
  - Application: SSE 事件處理 Use Cases
  - Adapter: Pinia 狀態管理、Vue 組件、REST API 與 SSE 整合

- **Local Game BC**: 離線單機遊戲引擎
  - Domain: 完整遊戲引擎邏輯、規則引擎、牌組管理
  - Application: 離線遊戲流程 Use Cases、對手決策邏輯
  - Adapter: 與 User Interface BC 的整合介面

**後端（Nuxt 4 或 Spring Boot + Java）**:
- **Core Game BC**: 核心遊戲服務
  - Domain: Game Aggregate、遊戲規則引擎
  - Application: 遊戲操作 Use Cases
  - Adapter: REST API、SSE、持久化

- **Opponent BC**: 對手策略服務
  - Domain: 對手決策邏輯
  - Application: 對手操作 Use Cases
  - Adapter: 策略服務整合

**未來 BCs**: User Service、Matchmaking Service、Analytics Service

**理由**: 支援 BCs 的獨立演化、防止緊耦合、支援微服務遷移。

---

### VII. Microservice-Ready Design

**所有設計決策必須考慮未來的微服務拆分：**

- 使用 UUIDs 作為所有實體 ID（避免自動遞增整數）
- 設計無狀態 APIs（狀態存於資料庫/快取，而非記憶體中）
- 盡可能採用事件驅動通訊模式
- 假設未來服務間的最終一致性（eventual consistency）
- 每個 Bounded Context 使用獨立資料庫（即使在 MVP 中邏輯分離）

**當前架構**: 單體應用（前端 Nuxt 4，後端待定）具有邏輯 BC 分離

**未來架構**: 多個服務（Game、User、Matchmaking、Opponent、Analytics）透過事件（Kafka/RabbitMQ）和 REST 通訊

**理由**: 避免擴展時的昂貴重寫、展示分散式系統設計理解。

---

### VIII. API Contract Adherence

**所有 API 和 SSE 實作必須嚴格遵循 `doc/shared/protocol.md`：**

- Endpoint URLs、HTTP methods、request/response 格式必須完全匹配
- SSE 事件名稱、payloads、資料結構必須完全匹配
- FlowStage 狀態機轉換必須精確遵循
- 基於快照的重連必須使用 `GameSnapshotRestore` 結構

**契約驗證**: 任何偏離 `doc/shared/protocol.md` 的情況必須記錄為規格變更，並附帶版本號更新。

**理由**: 確保前後端可以並行開發、防止整合失敗、作為活文檔（living documentation）。

---

## 架構約束

### 技術棧

- **前端**: Nuxt 4 + Vue 3 + TypeScript + Tailwind CSS v4 + Pinia（狀態管理）
- **後端**: Nuxt 4（TypeScript）或 Java 17+ / Spring Boot 3.x（待定）
- **資料庫**: PostgreSQL 14+（如使用 Java 後端則搭配 JPA/Hibernate）
- **通訊**: REST API（命令）、Server-Sent Events（事件）
- **測試**: Vitest（前端）、JUnit 5 或 Vitest（後端，視技術棧）、Playwright（可選 E2E）

**理由**: 這些技術展示現代全端能力，並保持技術棧選擇的彈性。

### 效能需求

- API 回應時間: P95 < 500ms
- SSE 事件推送延遲: < 100ms
- 支援 100+ 並發遊戲（MVP）
- 對手操作計算: < 1 秒

### 安全需求

- 所有 API endpoints 的輸入驗證
- CORS 限制於前端網域
- 生產環境強制 HTTPS
- 日誌或 SSE 事件中不得包含敏感資料
- 防止 SQL 注入（使用參數化查詢或 ORM）

### 可觀測性需求

- 結構化日誌（JSON 格式）
- 日誌層級: INFO（正常流程）、WARN（可恢復問題）、ERROR（失敗）
- Correlation IDs 用於請求追蹤
- 健康檢查端點
- （未來）Prometheus metrics、分散式追蹤

---

## 開發工作流程

### 分支策略

- `main`: 生產就緒程式碼
- `develop`: MVP 的整合分支
- Feature branches: `###-feature-name` 格式
- 所有功能必須在 `/specs/###-feature-name/spec.md` 中有規格

### Code Review 要求

- 所有 PRs 必須通過自動化測試（CI）
- 所有 PRs 必須審查是否符合憲法要求
- 修改 Domain/Application layers 的 PRs 必須包含測試
- 新增 REST endpoints 的 PRs 必須更新 API 文檔

### Definition of Done

功能完成的條件：

- [ ] spec.md 中的所有驗收標準已滿足
- [ ] Domain/Application Layer 測試已撰寫且通過（TDD red-green-refactor）
- [ ] 程式碼遵循 Clean Architecture 分層
- [ ] API 契約符合 `doc/shared/protocol.md`
- [ ] 所有 BC 邊界使用 DTOs（不暴露 Domain Model）
- [ ] API 文檔已更新
- [ ] Code review 已批准
- [ ] CI pipeline 通過

### 複雜度證明

任何違反簡單性的行為必須在 `plan.md` 的複雜度追蹤表中記錄：

- 引入了什麼複雜度
- 為何此特定功能需要它
- 拒絕了哪些更簡單的替代方案以及原因

**需要證明的範例**:
- 新增第 4 個 Bounded Context
- 引入快取層
- 新增 event bus/message queue（在多服務階段之前）

---

## 治理

### 憲法權威

此憲法凌駕於所有其他開發實踐。任何此文檔與其他指引之間的衝突必須以憲法為準。

### 修訂流程

1. 在 PR 描述中提出修訂及理由
2. 根據語義化版本更新 `CONSTITUTION_VERSION`：
   - **MAJOR**: 原則的破壞性變更（例如：移除 TDD 要求）
   - **MINOR**: 新增原則或重大擴充
   - **PATCH**: 澄清、錯別字、非語義修正
3. 更新 `LAST_AMENDED_DATE` 為修訂日期
4. 更新檔案頂部的 Sync Impact Report
5. 驗證並更新所有相依模板（plan、spec、tasks）
6. 需要所有活躍貢獻者批准

### 合規審查

- 每個 PR 必須驗證與核心原則的一致性
- `plan.md` 中的 Constitution Check 必須在 Phase 0 之前完成
- 任何已證明的複雜度必須每季度審查以考慮移除
- Domain/Application Layer 測試覆蓋率指標必須在 CI 中追蹤

### 執行期指引

關於功能實作期間特定代理的開發指引，請參考 `/CLAUDE.md`（專案指示）。憲法定義必須做什麼；CLAUDE.md 指引 Claude Code 如何導覽程式碼庫。

---

**Version**: 1.3.0 | **Ratified**: 2025-10-22 | **Last Amended**: 2025-12-04
