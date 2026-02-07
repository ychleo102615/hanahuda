# Feature Specification: 遊戲私房功能

**Feature Branch**: `013-private-room`
**Created**: 2026-02-05
**Status**: Draft
**Input**: User description: "建立遊戲私房功能。任何玩家能夠在大廳點選建立房間按鈕，設定遊戲規則（場數），並且得到一個有效期限 10 分鐘的遊戲房間。玩家此時強制參與這遊戲，無法再進入配對功能，或是其他人建立的房間。玩家在遊戲頁面時，能夠使用解散功能。私房會得到遊戲 id。可以透過分享 gameId 或是連結讓其他人進入這個房間。房間滿人之後，流程就與普通遊戲相同。玩家可以在大廳輸入遊戲 id 藉此加入私房。與普通配對模式隔離。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 建立私人房間 (Priority: P1)

玩家在大廳想要與特定朋友進行遊戲，而非隨機配對。玩家點選「建立房間」按鈕，設定遊戲場數規則後，系統建立一個專屬房間並產生房間 ID。玩家自動進入等待狀態，可以將房間 ID 或連結分享給朋友。

**Why this priority**: 這是私房功能的核心價值 - 讓玩家能夠建立專屬遊戲空間。沒有這個功能，整個私房機制無法運作。

**Independent Test**: 可以透過單一玩家建立房間、獲得房間 ID 並看到等待畫面來完整測試此功能。

**Acceptance Scenarios**:

1. **Given** 玩家在大廳且未參與任何遊戲, **When** 點選「建立房間」按鈕並選擇場數規則, **Then** 系統建立房間並顯示房間 ID 與可分享的連結
2. **Given** 玩家已建立房間, **When** 房間建立成功, **Then** 玩家自動進入該房間的等待畫面
3. **Given** 玩家已建立房間, **When** 嘗試進入配對功能或加入其他房間, **Then** 系統拒絕操作並提示玩家已在房間中

---

### User Story 2 - 透過房間 ID 加入私房 (Priority: P1)

玩家收到朋友分享的房間 ID，在大廳輸入該 ID 加入私人房間。加入後兩位玩家即可開始遊戲。

**Why this priority**: 與建立房間同等重要，沒有加入機制則私房功能無法完成其目的。

**Independent Test**: 可以透過一位玩家輸入有效房間 ID 並成功進入房間來測試。

**Acceptance Scenarios**:

1. **Given** 玩家在大廳且存在有效的私房, **When** 輸入正確的房間 ID 並確認加入, **Then** 玩家進入該私房並看到房主
2. **Given** 玩家在大廳, **When** 輸入不存在或已過期的房間 ID, **Then** 系統顯示「房間不存在或已過期」的提示
3. **Given** 玩家在大廳, **When** 輸入已滿人的房間 ID, **Then** 系統顯示「房間已滿」的提示

---

### User Story 3 - 透過連結加入私房 (Priority: P2)

玩家收到朋友分享的房間連結，點擊連結後直接進入私人房間。這提供比手動輸入 ID 更便捷的加入方式。

**Why this priority**: 是加入房間的便捷替代方案，但不是核心必要功能（可用 ID 替代）。

**Independent Test**: 可以透過點擊房間連結並成功進入房間來測試。

**Acceptance Scenarios**:

1. **Given** 玩家已登入且點擊有效的房間連結, **When** 頁面載入完成, **Then** 玩家直接進入該私房
2. **Given** 玩家未登入且點擊有效的房間連結, **When** 頁面載入完成, **Then** 玩家先被導向登入頁面，登入後自動進入該私房
3. **Given** 玩家點擊已過期或無效的房間連結, **When** 頁面載入完成, **Then** 系統顯示「房間不存在或已過期」並導向大廳

---

### User Story 4 - 房間有效期限管理 (Priority: P2)

房間建立後有 10 分鐘的有效期限。若在期限內沒有開始遊戲，房間自動解散。房主會收到即將過期的提醒。

**Why this priority**: 確保系統資源不被閒置房間佔用，是系統健康運作的必要機制。

**Independent Test**: 可以透過建立房間後等待 10 分鐘觀察房間是否自動解散來測試。

**Acceptance Scenarios**:

1. **Given** 房間已建立且接近 10 分鐘期限, **When** 剩餘時間少於 2 分鐘, **Then** 系統向房內玩家顯示即將過期提醒
2. **Given** 房間已建立且達到 10 分鐘期限, **When** 房間仍未滿人開始遊戲, **Then** 房間自動解散並通知房內玩家
3. **Given** 房間已滿人並開始遊戲, **When** 遊戲進行中, **Then** 10 分鐘期限不再適用，遊戲正常進行

---

### User Story 5 - 解散房間 (Priority: P2)

房主在等待其他玩家加入時，可以主動解散房間。解散後房主返回大廳，可以重新建立房間或使用其他功能。

**Why this priority**: 讓房主有控制權，可以在不想繼續等待時主動結束。

**Independent Test**: 可以透過房主點擊解散按鈕並確認房間消失、玩家返回大廳來測試。

**Acceptance Scenarios**:

1. **Given** 房主在私房等待畫面, **When** 點擊「解散房間」按鈕, **Then** 房間解散，房主返回大廳
2. **Given** 私房中有房主和一位已加入的玩家, **When** 房主解散房間, **Then** 兩位玩家都被通知房間已解散並返回大廳

---

### User Story 6 - 私房遊戲流程 (Priority: P1)

當私房滿人（兩位玩家）後，遊戲自動開始。遊戲流程與普通配對遊戲完全相同，包含遊戲規則、計分方式、勝負判定等。

**Why this priority**: 這是私房存在的最終目的 - 讓玩家能夠進行遊戲。

**Independent Test**: 可以透過兩位玩家加入私房後觀察遊戲是否正常開始並按照既有規則進行來測試。

**Acceptance Scenarios**:

1. **Given** 私房有房主等待中, **When** 第二位玩家加入, **Then** 遊戲立即開始，使用房主設定的場數規則
2. **Given** 私房遊戲進行中, **When** 遊戲結束, **Then** 顯示結果畫面，與普通遊戲結果畫面相同
3. **Given** 私房遊戲結束, **When** 玩家確認結果, **Then** 兩位玩家返回大廳

---

### Edge Cases

- 當玩家建立房間後網路斷線，房間如何處理？
  - **處理方式**: 若房主斷線超過 30 秒，房間自動解散
- 當第二位玩家正在加入時房間過期，如何處理？
  - **處理方式**: 加入請求失敗，顯示房間已過期
- 當玩家同時建立房間和加入配對，如何處理？
  - **處理方式**: 系統優先處理先發出的請求，拒絕後續請求
- 當玩家在私房等待中嘗試重複建立房間，如何處理？
  - **處理方式**: 系統拒絕並提示玩家已在房間中

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 允許已登入玩家在大廳建立私人房間
- **FR-002**: 系統 MUST 在建立房間時讓玩家選擇遊戲場數規則
- **FR-003**: 系統 MUST 為每個私人房間產生唯一的房間 ID
- **FR-004**: 系統 MUST 為每個私人房間產生可分享的連結
- **FR-005**: 系統 MUST 將建立房間的玩家自動加入該房間
- **FR-006**: 系統 MUST 阻止已在私房中的玩家進入配對功能
- **FR-007**: 系統 MUST 阻止已在私房中的玩家加入其他房間
- **FR-008**: 系統 MUST 設定私人房間的有效期限為 10 分鐘
- **FR-009**: 系統 MUST 在房間到期時自動解散房間並通知房內玩家
- **FR-010**: 系統 MUST 在房間剩餘時間少於 2 分鐘時向房內玩家顯示提醒
- **FR-011**: 系統 MUST 允許玩家透過輸入房間 ID 加入私房
- **FR-012**: 系統 MUST 允許玩家透過房間連結加入私房
- **FR-013**: 系統 MUST 在玩家透過連結加入但未登入時，先導向登入後自動加入房間
- **FR-014**: 系統 MUST 在房間 ID 無效或過期時顯示適當的錯誤訊息
- **FR-015**: 系統 MUST 在房間已滿時拒絕新玩家加入並顯示提示
- **FR-016**: 系統 MUST 允許房主在等待階段解散房間
- **FR-017**: 系統 MUST 在房間解散時通知所有房內玩家並將其導回大廳
- **FR-018**: 系統 MUST 在私房滿人時自動開始遊戲
- **FR-019**: 系統 MUST 使用房主設定的場數規則進行私房遊戲
- **FR-020**: 系統 MUST 確保私房遊戲流程與普通配對遊戲完全一致
- **FR-021**: 系統 MUST 在房主斷線超過 30 秒時自動解散房間

### Key Entities

- **PrivateRoom（私人房間）**: 代表一個私人遊戲房間。包含房間 ID、房主、訪客、遊戲規則設定、建立時間、有效期限、狀態（等待中/滿人/遊戲中/已過期/已解散）。分享連結（shareUrl）由 API Adapter 層根據 roomId 組裝，不屬於 Domain Model

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 玩家能在 5 秒內完成建立房間並獲得房間 ID
- **SC-002**: 玩家能在 3 秒內透過房間 ID 或連結成功加入房間
- **SC-003**: 房間滿人後 2 秒內自動開始遊戲
- **SC-004**: 私房遊戲完成率（開始到結束）達到 95% 以上
- **SC-005**: 房間過期提醒準確率達到 100%（在剩餘 2 分鐘內必定顯示）
- **SC-006**: 玩家能清楚區分私房模式與配對模式，不會誤操作

## Assumptions

- 遊戲場數規則選項沿用現有配對系統的規則選項
- 房間 ID 格式採用 6 位英數混合字元，易於口頭分享
- 私房遊戲不影響玩家的排名積分（與休閒模式一致）
- 單一玩家同時只能存在於一個私房中
- 房間連結格式為 `{domain}/room/{roomId}`

## Architecture Decisions

### AD-001: BC 歸屬 - Matchmaking BC 的擴展

**決策**: 將私房功能作為 Matchmaking BC 的擴展，而非建立新的 Bounded Context。

**理由**:
1. 私房與配對都屬於「遊戲前階段」(Pre-Game Phase)，核心目的都是「讓玩家找到對手」
2. 兩者最終都發布 `MATCH_FOUND` 事件，整合路徑一致，`GameCreationHandler` 無需修改
3. 專案規模適中，過度拆分會增加不必要的複雜度
4. 透過獨立的 `PrivateRoom` Aggregate 可保持概念清晰

**替代方案（未採用）**:
- 新建 Private-Room BC：職責分離更清楚，但增加整合複雜度，對目前規模過度設計

### AD-002: Domain Model 設計

**決策**: 建立 `PrivateRoom` 作為獨立的 Aggregate Root，與現有 `MatchmakingPool` 並存。

**結構**:
```
matchmaking/
├── domain/
│   ├── matchmakingPool.ts      # 現有：配對佇列 Aggregate
│   ├── matchmakingEntry.ts     # 現有
│   ├── privateRoom.ts          # 新增：私房 Aggregate Root (含 shareUrl 衍生方法)
│   └── matchResult.ts          # 擴展：加入 PRIVATE 類型
├── application/
│   └── use-cases/
│       ├── createPrivateRoomUseCase.ts    # 新增
│       ├── joinPrivateRoomUseCase.ts      # 新增
│       └── dissolvePrivateRoomUseCase.ts  # 新增
└── adapters/
    └── persistence/
        └── inMemoryPrivateRoomStore.ts    # 新增
```

### AD-003: 事件整合

**決策**: 擴展現有 `MatchType`，加入 `'PRIVATE'` 類型，重用 `MATCH_FOUND` 事件。

**理由**:
- `GameCreationHandler` 已訂閱 `MATCH_FOUND` 事件並建立遊戲
- 私房滿人時發布相同格式的事件，可無縫整合現有流程
- 避免建立重複的遊戲建立機制

**MatchType 擴展**:
```typescript
export type MatchType = 'HUMAN' | 'BOT' | 'PRIVATE'
```

### AD-004: 玩家狀態互斥

**決策**: 透過 `PlayerGameStatusPort` 統一查詢玩家狀態，確保玩家不能同時在配對佇列和私房中。

**實作要點**:
1. 建立私房前檢查：玩家不在配對佇列中、不在其他私房中、不在進行中的遊戲中
2. 進入配對前檢查：玩家不在私房中
3. 加入私房前檢查：玩家不在配對佇列中、不在其他私房中

### AD-005: Room ID vs Game ID

**決策**: Room ID 和 Game ID 是兩個不同的識別碼。

**說明**:
- **Room ID**: 私房建立時產生，用於邀請其他玩家加入（6 位英數字元）
- **Game ID**: 遊戲開始時由 Core-Game BC 產生，用於遊戲進行中的識別

**流程**:
1. 房主建立私房 → 產生 Room ID
2. 第二位玩家透過 Room ID 加入
3. 私房滿人 → 發布 `MATCH_FOUND` 事件
4. `GameCreationHandler` 建立遊戲 → 產生 Game ID
5. 兩位玩家收到 Game ID，進入遊戲

### AD-006: 與現有 BC 的整合點

| 整合點 | 方式 | 說明 |
|--------|------|------|
| Identity BC | Port 依賴 | 透過 `PlayerIdentityPort` 取得玩家資訊 |
| Core-Game BC | Domain Event | 發布 `MATCH_FOUND` 事件，由 `GameCreationHandler` 訂閱 |
| Game-Client BC (前端) | REST API + SSE | 提供房間建立/加入/解散 API，透過 SSE 推送房間狀態更新 |
