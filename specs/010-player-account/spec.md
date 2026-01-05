# Feature Specification: 玩家帳號功能 (Player Account System)

**Feature Branch**: `010-player-account`
**Created**: 2026-01-01
**Status**: Draft
**Input**: User description: "新增玩家帳號功能 - 支援帳號密碼註冊、OAuth 登入、訪客模式，並於前端整合註冊流程與遊戲畫面顯示"

## Clarifications

### Session 2026-01-01

- Q: 認證狀態管理策略（Session vs JWT vs 混合）？ → A: Session-based（HTTP-only Cookie 存 Session ID，後端維護 Session Store）
- Q: 登入失敗防護策略（帳號鎖定/IP 限制/混合）？ → A: MVP 不實作，僅記錄失敗日誌，後續迭代加入
- Q: 訪客資料清理策略？ → A: 定期清理（排程任務刪除超過 90 天未活躍的訪客資料）
- Q: OAuth 帳號連結條件（Email 不匹配時）？ → A: 提示手動連結（顯示「是否連結至現有帳號」，需輸入密碼驗證）
- Q: Session 過期時間？ → A: 7 天滑動過期（每次請求延長，7 天無活動則過期）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 訪客遊玩 (Priority: P1)

玩家首次造訪網站時，無需註冊即可直接進入大廳並開始遊戲。系統自動為玩家建立臨時身份，並透過 Cookie 記住該玩家。玩家可在後續造訪時繼續使用同一身份，其遊戲紀錄與統計數據將被保留。

**Why this priority**: 這是最基本的使用情境，確保所有玩家（包含不想註冊的玩家）都能立即體驗遊戲，降低進入門檻，是 MVP 的核心價值。

**Independent Test**: 可透過清除瀏覽器 Cookie 後造訪網站，驗證系統自動建立臨時身份，並在不清除 Cookie 的情況下重新造訪確認身份保留。

**Acceptance Scenarios**:

1. **Given** 玩家首次造訪網站且無任何 Cookie, **When** 玩家訪問任何頁面, **Then** 系統自動建立臨時玩家 ID 並設置於 Cookie 中
2. **Given** 玩家已有臨時身份 Cookie, **When** 玩家重新造訪網站, **Then** 系統識別該 Cookie 並恢復玩家身份
3. **Given** 訪客玩家在大廳等待中, **When** 進入大廳前系統詢問是否建立帳號, **Then** 玩家可選擇「繼續訪客模式」跳過註冊
4. **Given** 玩家選擇「不再詢問」, **When** 下次進入大廳, **Then** 系統不再顯示註冊提示

---

### User Story 2 - 帳號密碼註冊 (Priority: P2)

玩家可在首頁或大廳入口處使用帳號（使用者名稱）與密碼建立帳號。系統驗證帳號唯一性，若帳號已被使用則即時提示玩家更換。Email 為選填欄位。

**Why this priority**: 帳號系統是持久化玩家身份的基礎，為後續功能（如跨裝置登入、排行榜）打下基礎。

**Independent Test**: 可透過填寫表單並提交，驗證帳號建立成功與重複帳號的錯誤提示。

**Acceptance Scenarios**:

1. **Given** 玩家在首頁, **When** 玩家點擊「註冊」並輸入唯一的帳號與密碼, **Then** 系統建立帳號並自動登入
2. **Given** 玩家輸入已存在的帳號, **When** 提交註冊表單, **Then** 系統顯示「帳號已被使用」的錯誤訊息
3. **Given** 玩家為訪客身份, **When** 成功註冊帳號, **Then** 訪客時期的遊戲紀錄自動轉移至新帳號
4. **Given** 玩家未填寫 Email, **When** 提交註冊表單, **Then** 系統允許註冊成功（Email 為選填）

---

### User Story 3 - OAuth 社群登入 (Priority: P2)

玩家可透過 Google 或 Line 帳號快速註冊與登入，免去記憶密碼的負擔。系統設計需保留未來擴充其他 OAuth Provider 的彈性。

**Why this priority**: OAuth 登入可大幅提升註冊轉換率，與密碼註冊同等重要，但技術複雜度較高。

**Independent Test**: 可透過點擊「使用 Google 登入」按鈕，完成 OAuth 流程後驗證帳號建立成功。

**Acceptance Scenarios**:

1. **Given** 玩家選擇「使用 Google 登入」, **When** 完成 Google 授權流程, **Then** 系統建立或連結帳號並自動登入
2. **Given** 玩家選擇「使用 Line 登入」, **When** 完成 Line 授權流程, **Then** 系統建立或連結帳號並自動登入
3. **Given** 玩家已有訪客身份, **When** 透過 OAuth 註冊, **Then** 訪客紀錄自動轉移至 OAuth 帳號
4. **Given** 玩家已有密碼帳號, **When** 使用相同 Email 的 OAuth 登入, **Then** 系統自動連結兩個登入方式至同一帳號
5. **Given** 玩家已有密碼帳號, **When** 使用不同 Email 的 OAuth 登入, **Then** 系統提示「是否連結至現有帳號」，玩家需輸入密碼驗證後完成連結

---

### User Story 4 - 遊戲畫面顯示玩家名稱 (Priority: P3)

遊戲進行中，畫面上顯示玩家與對手的名稱，讓遊戲體驗更具個人化。訪客玩家顯示系統生成的預設名稱，註冊玩家顯示其帳號名稱。

**Why this priority**: 增強遊戲沉浸感，但不影響核心遊戲功能，可在基礎功能完成後加入。

**Independent Test**: 可在遊戲畫面中驗證玩家名稱正確顯示。

**Acceptance Scenarios**:

1. **Given** 訪客玩家進入遊戲, **When** 遊戲畫面載入, **Then** 顯示系統生成的預設名稱（如「Guest_XXXX」）
2. **Given** 已註冊玩家進入遊戲, **When** 遊戲畫面載入, **Then** 顯示玩家的帳號名稱
3. **Given** 對手為 AI, **When** 遊戲畫面載入, **Then** 對手名稱顯示為「Computer」或相應 AI 名稱

---

### User Story 5 - 帳號登入 (Priority: P2)

已註冊的玩家可透過帳號密碼或 OAuth 重新登入，恢復其遊戲紀錄與統計數據。

**Why this priority**: 登入是帳號系統的必要功能，與註冊同等重要。

**Independent Test**: 可透過登出後重新輸入帳號密碼驗證登入成功。

**Acceptance Scenarios**:

1. **Given** 玩家已有帳號, **When** 輸入正確的帳號與密碼, **Then** 系統登入成功並載入玩家資料
2. **Given** 玩家輸入錯誤的密碼, **When** 提交登入表單, **Then** 系統顯示「帳號或密碼錯誤」的訊息
3. **Given** 玩家已透過 OAuth 註冊, **When** 使用相同 OAuth Provider 登入, **Then** 系統登入成功

---

### Edge Cases

- 當 Cookie 被使用者手動清除時，系統建立新的臨時身份，原有訪客資料無法恢復
- 當 OAuth Provider 服務中斷時，系統應顯示友善的錯誤訊息並建議使用其他登入方式
- 當玩家嘗試使用已綁定其他帳號的 OAuth 登入時，系統應提示該 OAuth 帳號已被使用
- 當密碼不符合安全要求時（如長度過短），系統應即時提示並說明密碼規則
- 當帳號名稱包含不允許的字元時，系統應提示並說明命名規則

## Requirements *(mandatory)*

### Functional Requirements

#### 後端 - 帳號管理

- **FR-001**: 系統 MUST 提供帳號密碼註冊功能，帳號為必填且唯一，密碼為必填，Email 為選填
- **FR-002**: 系統 MUST 在帳號重複時回傳明確的錯誤訊息（如 HTTP 409 Conflict）
- **FR-003**: 系統 MUST 安全地儲存密碼（使用標準雜湊演算法，不可明文儲存）
- **FR-004**: 系統 MUST 支援 Google OAuth 2.0 登入與註冊
- **FR-005**: 系統 MUST 支援 Line OAuth 2.1 登入與註冊
- **FR-006**: 系統 MUST 採用可擴充的 OAuth Provider 架構，便於日後新增其他 Provider
- **FR-006a**: 當 OAuth Email 與現有帳號 Email 相同時，系統 MUST 自動連結至該帳號
- **FR-006b**: 當 OAuth Email 與現有帳號不符時，系統 MUST 提供「連結至現有帳號」選項，需輸入密碼驗證後完成連結

#### 後端 - 訪客管理

- **FR-007**: 系統 MUST 為首次造訪的玩家自動建立臨時玩家身份（包含唯一 ID 與預設名稱）
- **FR-008**: 系統 MUST 透過 HTTP-only Cookie 記住訪客身份，Cookie 有效期為 30 天
- **FR-009**: 系統 MUST 在訪客註冊帳號時，將訪客資料（遊戲紀錄、統計數據）轉移至新帳號
- **FR-010**: 系統 MUST 在 Cookie 過期或遺失時，將該訪客視為新玩家處理
- **FR-010a**: 系統 MUST 提供排程任務，定期刪除超過 90 天未活躍的訪客資料（Player 及關聯的遊戲紀錄）

#### 後端 - 身份驗證

- **FR-011**: 系統 MUST 提供登入 API，支援帳號密碼與 OAuth 兩種方式
- **FR-012**: 系統 MUST 在登入成功後建立 Session，並透過 HTTP-only Cookie 存放 Session ID（後端維護 Session Store），Session 有效期為 7 天滑動過期
- **FR-013**: 系統 MUST 提供登出 API，清除認證狀態
- **FR-013a**: 系統 MUST 記錄登入失敗事件（含時間戳、IP、帳號），供後續分析與安全迭代使用

#### 前端 - 註冊與登入

- **FR-014**: 首頁 MUST 提供「註冊」與「登入」入口，連結至對應表單或 Modal
- **FR-015**: 註冊表單 MUST 包含：帳號、密碼、確認密碼、Email（選填）
- **FR-016**: 註冊表單 MUST 提供 Google 與 Line OAuth 登入按鈕
- **FR-017**: 表單 MUST 即時驗證輸入格式（帳號格式、密碼強度、Email 格式）

#### 前端 - 訪客流程

- **FR-018**: 進入大廳前，若玩家未登入，系統 MUST 顯示「是否建立帳號」的提示
- **FR-019**: 提示 MUST 提供「立即註冊」、「稍後再說」、「不再詢問」三個選項
- **FR-020**: 當玩家選擇「不再詢問」，系統 MUST 記住此偏好（存於 Cookie 或 Local Storage），後續不再顯示提示
- **FR-021**: 前端 MUST 移除現有的自動生成 UUID 作為玩家 ID 的功能，改由後端統一管理

#### 前端 - 遊戲畫面

- **FR-022**: 遊戲畫面 MUST 顯示玩家名稱（訪客顯示預設名稱，註冊玩家顯示帳號名稱）
- **FR-023**: 遊戲畫面 MUST 顯示對手名稱（AI 顯示「Computer」或對應名稱）

#### 前端 - 登入體驗優化

- **FR-024**: 首頁的「Sign In」按鈕 MUST 觸發 Login Modal 覆蓋顯示，而非跳轉至獨立頁面
- **FR-024a**: Login Modal MUST 複用現有 LoginForm.vue 與 OAuthButtons.vue 元件
- **FR-024b**: Login Modal MUST 提供「建立帳號」連結，點擊後導航至 /register 頁面
- **FR-024c**: Login Modal MUST 在登入成功後自動關閉
- **FR-024d**: Login Modal MUST 支援點擊背景或按 ESC 鍵關閉

#### 前端 - 登入回饋與玩家識別

- **FR-025**: 登入成功時 MUST 顯示 Toast 通知，包含歡迎訊息和玩家名稱（3 秒自動消失）
- **FR-026**: 首頁導航列 MUST 在玩家登入後，於 Start Game 按鈕左側顯示玩家 icon（CTA 作為視覺終點）
- **FR-027**: 玩家 icon 點擊 MUST 彈出資訊卡，顯示玩家名稱、帳號類型、登出功能
- **FR-027a**: 玩家資訊卡 MUST 支援點擊外部或按 ESC 關閉
- **FR-027b**: 訪客玩家的資訊卡 SHOULD 顯示「建立帳號」提示連結
- **FR-027c**: 玩家資訊卡 MUST 使用錨點定位，出現在玩家 icon 正下方（非固定於螢幕右側）
- **FR-028**: 未登入時，Sign In 按鈕 MUST 顯示於 Start Game 按鈕左側（CTA 作為視覺終點）

#### 後端 - 帳號刪除

- **FR-029**: 刪除帳號時，系統 MUST 依序刪除以下資料以符合外鍵約束：Sessions → OAuth Links → Account → Player Stats → Player

#### 前端 - 大廳與遊戲頁面玩家資訊

- **FR-030**: 大廳與遊戲頁面的玩家圖示點擊 MUST 顯示純資訊小卡（僅顯示玩家名稱與帳號類型）
- **FR-030a**: 純資訊小卡 MUST 不包含任何操作按鈕（登出、刪除帳號等功能由選單按鈕觸發）
- **FR-030b**: 純資訊小卡 MUST 使用錨點定位，出現在玩家圖示正下方

### Key Entities

- **Player**: 代表遊戲中的玩家身份，包含唯一識別碼、顯示名稱、建立時間、是否為訪客
- **Account**: 代表已註冊的帳號，包含帳號名稱、密碼雜湊、Email（選填）、關聯的 Player
- **OAuthLink**: 代表 OAuth 綁定關係，包含 Provider 類型、Provider 使用者 ID、關聯的 Account
- **GuestToken**: 代表訪客身份憑證，包含臨時 ID、關聯的 Player、過期時間

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 玩家可在 60 秒內完成帳號密碼註冊流程（從點擊註冊到登入成功）
- **SC-002**: 玩家可在 30 秒內完成 OAuth 註冊流程（從點擊 OAuth 按鈕到登入成功）
- **SC-003**: 訪客玩家可在 5 秒內進入大廳開始遊戲（無需任何註冊步驟）
- **SC-004**: 訪客轉為註冊帳號後，100% 的歷史遊戲紀錄成功轉移
- **SC-005**: 帳號重複時，系統在 1 秒內回應錯誤訊息
- **SC-006**: 遊戲畫面中的玩家名稱在頁面載入後 1 秒內正確顯示
- **SC-007**: Cookie 有效期內的訪客重新造訪時，身份識別成功率達 100%

## Assumptions

- 密碼安全要求：最少 8 個字元，包含至少一個字母與一個數字
- 帳號名稱規則：3-20 個字元，僅允許英文字母、數字、底線
- 預設訪客名稱格式：「Guest_」加上 4 位隨機英數字（如 Guest_A1B2）
- OAuth 授權範圍：僅請求基本資料（ID、名稱、Email），不請求額外權限
- 已選擇「不再詢問」的偏好可透過登出或清除 Local Storage 重置
- 登入失敗防護（Rate Limiting、帳號鎖定）為後續迭代功能，MVP 僅記錄日誌
- Session 有效期 7 天，每次請求自動延長（滑動過期）；7 天無活動則自動登出

## Architecture Context - Bounded Context 設計

本功能將在前後端各自新增獨立的 **Identity BC**，與現有 BC 分離。

### 後端 - Identity BC

**職責**:
- 玩家身份管理（Player 生命週期）
- 帳號註冊與認證（帳號密碼、OAuth）
- 訪客身份管理（臨時 ID、Cookie Token）
- 身份驗證與授權（Session/Token 管理）

**核心領域模型**:
- **Player** (Aggregate Root): 玩家身份，統一管理訪客與註冊玩家
- **Account** (Entity): 已註冊的帳號資訊
- **OAuthLink** (Entity): OAuth 綁定關係
- **GuestToken** (Value Object): 訪客身份憑證

**與其他 BC 交互**:
- **Identity BC → Core Game BC**: 提供 Player ID 與玩家名稱，供遊戲會話使用
- **Core Game BC → Identity BC**: 查詢玩家資訊（透過 Player ID）

```
┌─────────────────────────────────────────────────────────────┐
│  Identity BC                    Core Game BC                │
│  ┌───────────────┐             ┌───────────────┐            │
│  │ Player        │ ──────────▶ │ Game          │            │
│  │ Account       │  Player ID  │ Round         │            │
│  │ OAuthLink     │  & Name     │ ...           │            │
│  │ GuestToken    │             │               │            │
│  └───────────────┘             └───────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 前端 - Identity BC

**職責**:
- 身份狀態管理（登入狀態、玩家資訊）
- 註冊/登入表單 UI 與驗證邏輯
- OAuth 流程處理
- 訪客提示流程（大廳入口前的註冊提示）

**核心領域模型**:
- **CurrentPlayer** (Value Object): 當前玩家身份資訊（ID、名稱、是否訪客、是否已登入）
- **AuthState** (Value Object): 認證狀態

**與其他 BC 交互**:
- **Identity BC → User Interface BC**: 提供 CurrentPlayer 資訊，供遊戲畫面顯示玩家名稱
- **User Interface BC → Identity BC**: 觸發身份檢查（如進入大廳前）

```
┌─────────────────────────────────────────────────────────────┐
│  Identity BC                    User Interface BC           │
│  ┌───────────────┐             ┌───────────────┐            │
│  │ CurrentPlayer │ ──────────▶ │ GameStateStore│            │
│  │ AuthState     │  Player     │ (playerName)  │            │
│  │               │  Info       │               │            │
│  └───────────────┘             └───────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 前置工作 - 後端 Core Game BC 隔離

目前後端結構為扁平式 (`server/domain/`, `server/application/`, `server/adapters/`)，需先重構為 BC 隔離結構：

**現狀**:
```
server/
├── domain/                       # 混合在根目錄
├── application/
├── adapters/
└── api/v1/
```

**重構後**:
```
server/
├── core-game/                    # Core Game BC (重構移入)
│   ├── domain/
│   ├── application/
│   └── adapters/
├── identity/                     # Identity BC (新增)
│   ├── domain/
│   ├── application/
│   └── adapters/
└── api/v1/                       # API Routes (依 BC 分類)
    ├── games/                    # Core Game BC 路由
    └── auth/                     # Identity BC 路由
```

**重構步驟**:
1. 建立 `server/core-game/` 目錄
2. 將現有 `server/domain/` 移至 `server/core-game/domain/`
3. 將現有 `server/application/` 移至 `server/core-game/application/`
4. 將現有 `server/adapters/` 移至 `server/core-game/adapters/`
5. 更新所有 import 路徑
6. 驗證現有功能正常運作

### 目錄結構預覽

**後端** (重構後完整結構):
```
server/
├── core-game/                    # Core Game BC (existing, 重構後)
│   ├── domain/                   # Domain Layer
│   │   ├── game/                 # Game Aggregate
│   │   ├── round/                # Round Entity
│   │   ├── types/                # Value Objects
│   │   └── services/             # Domain Services
│   ├── application/              # Application Layer
│   │   ├── ports/                # Port 介面
│   │   └── use-cases/            # Use Cases
│   └── adapters/                 # Adapter Layer
│       ├── persistence/          # Repository 實作
│       ├── event/                # SSE Publisher
│       └── lock/                 # 並發控制
│
├── identity/                     # Identity BC (新增)
│   ├── domain/                   # Domain Layer
│   │   ├── player/               # Player Aggregate
│   │   ├── account/              # Account Entity
│   │   └── services/             # Domain Services
│   ├── application/              # Application Layer
│   │   ├── ports/                # Port 介面
│   │   └── use-cases/            # Use Cases
│   └── adapters/                 # Adapter Layer
│       ├── persistence/          # Repository 實作
│       └── oauth/                # OAuth Provider 整合
│
├── api/v1/                       # REST API Routes
│   ├── games/                    # Core Game BC 路由
│   └── auth/                     # Identity BC 路由
│
└── database/                     # 共用資料庫設定
    ├── schema.ts
    └── migrations/
```

**前端**:
```
app/
├── identity/                     # Identity BC
│   ├── domain/                   # Domain Layer
│   │   └── current-player.ts     # CurrentPlayer 類型
│   ├── application/              # Application Layer
│   │   ├── ports/                # Port 介面
│   │   └── use-cases/            # Use Cases
│   └── adapter/                  # Adapter Layer
│       ├── stores/               # Pinia Store (authStore)
│       ├── api/                  # Auth API Client
│       └── composables/          # useCurrentPlayer, useAuth
└── user-interface/               # User Interface BC (existing)
```

### BC 邊界與契約

Identity BC 將透過明確定義的介面與其他 BC 溝通：

**後端輸出契約** (Identity BC 對外提供):
- `getPlayerById(playerId: string): Player | null`
- `getCurrentPlayer(sessionToken: string): Player | null`

**前端輸出契約** (Identity BC 對外提供):
- `useCurrentPlayer(): CurrentPlayer` (Composable)
- `authStore.isLoggedIn: boolean`
- `authStore.playerName: string`
