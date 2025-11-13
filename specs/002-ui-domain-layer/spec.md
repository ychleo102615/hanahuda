# Feature Specification: User Interface BC Domain Layer

**Feature Branch**: `002-ui-domain-layer`
**Created**: 2025-11-13
**Status**: Draft
**Input**: User description: "根據 @doc/readme.md @doc/frontend/user-interface/domain.md @doc/shared/ @doc/quality/ 開發 user-interface BC domain layer"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 卡片識別與驗證 (Priority: P1)

前端開發者需要能夠識別和驗證花札卡片,確保用戶操作的卡片符合標準花札牌組規則。這是所有遊戲邏輯的基礎。

**Why this priority**: 這是整個 UI Domain Layer 的基礎能力,沒有卡片識別就無法進行任何配對或遊戲邏輯驗證。這是最核心、最基礎的功能,必須優先實現。

**Independent Test**: 可以通過提供任意卡片數據（month, type, index）來測試是否能正確識別其是否為標準牌組中的有效卡片,並能通過語義化常數（如 MATSU_HIKARI）快速查詢卡片屬性。

**Acceptance Scenarios**:

1. **Given** 開發者導入卡片數據庫,**When** 使用語義化常數 `MATSU_HIKARI` 查詢卡片,**Then** 系統返回正確的卡片屬性（month=1, type=BRIGHT, index=1）
2. **Given** 用戶嘗試使用卡片 `{month: 1, type: "BRIGHT", index: 1}`,**When** 調用 `isValidCard()` 函數,**Then** 系統返回 `true`（因為這是標準牌組中的松上鶴）
3. **Given** 開發者提供無效卡片 `{month: 13, type: "BRIGHT", index: 1}`,**When** 調用 `isValidCard()` 函數,**Then** 系統返回 `false`（不存在第13個月）
4. **Given** 開發者需要檢查卡片類型,**When** 查詢 `HAGI_INO` 的 type 屬性,**Then** 系統返回 "ANIMAL"（種牌）

---

### User Story 2 - 配對規則驗證 (Priority: P1)

前端需要即時判斷用戶選擇的手牌與場牌是否可以配對（相同月份）,並在 UI 上提供即時反饋（如高亮可配對的牌）。

**Why this priority**: 這是用戶交互的核心邏輯,用戶需要知道哪些牌可以配對。沒有這個功能,用戶無法進行有效的遊戲操作。這是 P1 因為它直接影響用戶體驗。

**Independent Test**: 提供一張手牌和一組場牌,測試系統是否能正確返回所有可配對的場牌列表（空陣列、單一配對、多重配對三種情況）。

**Acceptance Scenarios**:

1. **Given** 手牌為 `MATSU_HIKARI` (1月光牌),場上有 `MATSU_AKATAN` (1月短冊) 和 `UME_AKATAN` (2月短冊),**When** 調用 `findMatchableCards(handCard, fieldCards)`,**Then** 系統返回 `[MATSU_AKATAN]`（只有同月份可配對）
2. **Given** 手牌為 `SAKURA_AKATAN` (3月短冊),場上有 3 張 3 月的牌,**When** 調用配對檢查,**Then** 系統返回包含 3 張卡片的陣列（多重配對情況）
3. **Given** 手牌為 `KIKU_AOTAN` (9月短冊),場上沒有 9 月的牌,**When** 調用配對檢查,**Then** 系統返回空陣列 `[]`（無配對）
4. **Given** 兩張不同月份的卡片,**When** 調用 `canMatch(card1, card2)`,**Then** 系統返回 `false`
5. **Given** 兩張相同月份但不同類型的卡片（如 1 月光牌和 1 月短冊）,**When** 調用 `canMatch()`,**Then** 系統返回 `true`（只要月份相同即可配對）

---

### User Story 3 - 客戶端操作預驗證 (Priority: P1)

在用戶發送命令到伺服器前,前端需要進行基本驗證（例如卡片是否存在於手牌中、選擇的目標是否在可配對列表中）,以避免發送明顯無效的命令,提升用戶體驗。

**Why this priority**: 雖然伺服器擁有最終驗證權,但客戶端預驗證可以提供即時反饋,避免網絡往返延遲,改善用戶體驗。這是 P1 因為它是基本的 UI 友好性要求。

**Independent Test**: 提供手牌列表、待驗證的卡片和可配對目標列表,測試驗證函數是否能正確判斷操作合法性。

**Acceptance Scenarios**:

1. **Given** 用戶手牌為 `[MATSU_HIKARI, UME_AKATAN]`,**When** 用戶嘗試打出 `SAKURA_AKATAN`（不在手牌中）,**Then** `validateCardExists()` 返回 `false`
2. **Given** 可配對目標列表為 `[MATSU_AKATAN, MATSU_KASU_1]`,**When** 用戶選擇 `UME_AKATAN` 作為目標,**Then** `validateTargetInList()` 返回 `false`
3. **Given** 用戶手牌包含要打出的卡片,**When** 調用驗證函數,**Then** 系統返回 `true`,允許發送命令
4. **Given** 空手牌列表,**When** 嘗試驗證任意卡片,**Then** 系統返回 `false`

---

### User Story 4 - 役種進度計算 (Priority: P2)

前端需要計算並顯示用戶距離達成特定役種還差多少張牌,例如「距離赤短還差 1 張」,幫助用戶做出策略決策。

**Why this priority**: 這是輔助功能,提升用戶體驗但不影響核心遊戲流程。用戶可以在沒有進度提示的情況下進行遊戲,但有了提示後體驗會更好。因此為 P2。

**Independent Test**: 提供役種類型和用戶已獲得牌組,測試系統是否能正確計算缺少的卡片和完成百分比。

**Acceptance Scenarios**:

1. **Given** 役種為「赤短」,用戶已獲得 `[MATSU_AKATAN, UME_AKATAN]`,**When** 調用 `calculateYakuProgress("AKATAN", depositoryCards)`,**Then** 系統返回 `{required: [MATSU_AKATAN, UME_AKATAN, SAKURA_AKATAN], obtained: [MATSU_AKATAN, UME_AKATAN], missing: [SAKURA_AKATAN], progress: 66.67}`
2. **Given** 役種為「豬鹿蝶」,用戶尚未獲得任何相關卡片,**When** 調用進度計算,**Then** 系統返回 `progress: 0`,`missing` 包含全部 3 張所需卡片
3. **Given** 用戶已完成「五光」役種,**When** 調用進度計算,**Then** 系統返回 `progress: 100`,`missing` 為空陣列
4. **Given** 役種為「短冊」（需要 5 張以上）,用戶已獲得 3 張短冊,**When** 調用進度計算,**Then** 系統返回 `progress: 60%`（3/5）,`missing` 包含 2 張任意短冊

---

### Edge Cases

- **空輸入處理**: 當手牌陣列為空時,配對檢查應返回空陣列,驗證函數應返回 `false`
- **無效卡片數據**: 當卡片 month 超出 1-12 範圍、type 不在定義的枚舉中、或 index 超出該月該類型的牌數時,`isValidCard()` 應返回 `false`
- **多重配對極限情況**: 當場上有 3 張同月份的牌時（月見情況）,系統應正確返回包含 3 張卡片的陣列
- **役種進度計算邊界**: 對於「かす」（10 張以上）、「短冊」（5 張以上）等動態役種,進度計算應正確處理超出基礎要求的情況
- **卡片相等性判斷**: 兩張卡片的比較應基於 month、type、index 三個屬性,而非物件引用
- **語義化常數完整性**: 卡片數據庫應包含全部 48 張標準花札牌,且常數命名應清晰可讀（如 `MATSU_HIKARI`、`HAGI_INO`）

## Requirements *(mandatory)*

### Functional Requirements

#### 卡片核心邏輯

- **FR-001**: 系統必須提供語義化常數來識別所有 48 張標準花札牌（例如 `MATSU_HIKARI`、`HAGI_INO`、`SAKURA_AKATAN` 等）
- **FR-002**: 每張卡片必須包含三個業務屬性：`month`（1-12）、`type`（BRIGHT/ANIMAL/RIBBON/PLAIN）、`index`（該月該類型的第幾張）
- **FR-003**: 系統必須提供 `isValidCard(card)` 函數,驗證卡片是否在標準 48 張牌組中
- **FR-004**: 系統必須提供 `ALL_CARDS` 常數陣列,包含全部 48 張標準牌的定義
- **FR-005**: 卡片比較必須基於業務屬性（month、type、index）,而非物件引用

#### 配對驗證邏輯

- **FR-006**: 系統必須提供 `canMatch(card1, card2)` 函數,判斷兩張牌是否可配對（相同月份）
- **FR-007**: 系統必須提供 `findMatchableCards(handCard, fieldCards)` 函數,返回場牌中所有可與手牌配對的卡片陣列
- **FR-008**: 配對函數必須能正確處理三種情況：無配對（空陣列）、單一配對（1 個元素）、多重配對（2-3 個元素）
- **FR-009**: 配對規則必須僅基於月份相同,不考慮卡片類型或分數

#### 客戶端預驗證

- **FR-010**: 系統必須提供 `validateCardExists(card, handCards)` 函數,檢查卡片是否在手牌陣列中
- **FR-011**: 系統必須提供 `validateTargetInList(target, possibleTargets)` 函數,檢查目標是否在可配對列表中
- **FR-012**: 驗證函數必須在發送伺服器命令前調用,提供即時 UI 反饋
- **FR-013**: 驗證失敗時不應阻止用戶操作,僅提供警告（伺服器擁有最終驗證權）

#### 役種進度計算

- **FR-014**: 系統必須定義 `YAKU_REQUIREMENTS` 常數映射,包含所有 12 種標準役種及其所需卡片列表
- **FR-015**: 系統必須提供 `calculateYakuProgress(yakuType, depositoryCards)` 函數,返回役種進度物件（包含 `required`、`obtained`、`missing`、`progress` 四個屬性）
- **FR-016**: 系統必須提供 `getMissingCards(required, obtained)` 函數,計算缺少的卡片（差集運算）
- **FR-017**: 進度百分比計算必須為 0-100 的數值,公式為 `(obtained.length / required.length) * 100`
- **FR-018**: 對於動態役種（如「かす」10 張以上、「短冊」5 張以上）,進度計算應使用基礎要求數量（10 張、5 張）作為分母

### 非功能需求

- **NFR-001**: 所有 Domain Layer 函數必須是純函數（無副作用、相同輸入保證相同輸出）
- **NFR-002**: 不得依賴任何外部框架（Vue、Pinia、UI 組件等）
- **NFR-003**: 所有函數必須可獨立測試,無需 UI 環境或瀏覽器 API
- **NFR-004**: 單元測試覆蓋率要求：卡片邏輯 100%、配對驗證 100%、役種進度計算 > 90%
- **NFR-005**: 測試框架使用 Vitest,斷言庫使用內建 `expect`
- **NFR-006**: 所有邊界情況（空輸入、無效資料、極限配對）必須有測試用例
- **NFR-007**: 卡片常數命名必須語義化、清晰可讀,避免使用數字編號

### Key Entities

- **Card（卡片）**: 花札遊戲的基本單位,包含 `month`（月份 1-12）、`type`（類型：光/種/短/かす）、`index`（該月該類型的序號）三個屬性。前端使用此結構進行配對判斷和 UI 顯示。
- **YakuType（役種類型）**: 字串枚舉,表示 12 種標準役種（如 "AKATAN"、"AOTAN"、"GOKO"、"INOSHIKACHO" 等）。用於役種進度計算和 UI 顯示。
- **YakuProgress（役種進度）**: 包含 `required`（所需卡片陣列）、`obtained`（已獲得卡片陣列）、`missing`（缺少卡片陣列）、`progress`（完成百分比 0-100）四個屬性,用於 UI 顯示進度提示。
- **CardDatabase（卡片數據庫）**: 包含 `ALL_CARDS` 陣列（全部 48 張標準牌）和語義化常數（如 `MATSU_HIKARI`）,作為單一真實來源 (Single Source of Truth)。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 前端開發者能在 1 分鐘內通過語義化常數（如 `MATSU_HIKARI`）查詢到正確的卡片屬性,無需查閱文檔或記憶卡片編號
- **SC-002**: 配對驗證函數 `findMatchableCards()` 在處理完整 8 張場牌時,回應時間少於 1 毫秒（純函數運算）
- **SC-003**: 單元測試覆蓋率達到：卡片邏輯 100%、配對驗證 100%、役種進度計算 > 90%,且所有測試通過
- **SC-004**: 所有邊界情況（空輸入、無效資料、多重配對、極限情況）都有對應測試用例,且測試通過率 100%
- **SC-005**: 客戶端預驗證能在用戶操作後 50 毫秒內提供即時反饋（如禁用無效按鈕、高亮可配對牌）
- **SC-006**: 役種進度計算能正確處理全部 12 種標準役種,且計算結果與遊戲規則文檔一致
- **SC-007**: Domain Layer 代碼不包含任何框架依賴（如 Vue、Pinia）,可在 Node.js 環境中獨立運行測試
- **SC-008**: 用戶在遊戲過程中,90% 以上的無效操作能在客戶端被即時攔截（發送到伺服器前）,減少網絡往返和伺服器負載
- **SC-009**: 前端開發者能在 30 分鐘內理解並使用 Domain Layer API（通過語義化命名和清晰的函數簽名）
- **SC-010**: 代碼審查時,Domain Layer 代碼符合 Clean Architecture 原則：純函數、框架無關、可測試性 100%

## Assumptions

1. **卡片編號規則**: 假設使用 MMTI 格式（月份+類型+索引）,與 `protocol.md` 定義的 `card_id` 格式一致
2. **役種定義**: 假設使用標準「こいこい」規則的 12 種役種,與 `game-rules.md` 定義一致
3. **配對規則**: 假設僅基於月份相同進行配對,不考慮特殊規則（如柳月特殊處理）
4. **測試框架**: 假設專案已安裝 Vitest 和相關測試工具
5. **TypeScript 環境**: 假設前端專案使用 TypeScript,Domain Layer 代碼將提供類型定義
6. **伺服器權威**: 假設前端驗證僅用於 UI 反饋,伺服器擁有最終驗證權,前端驗證錯誤不會導致遊戲狀態不一致
7. **語義化命名**: 假設卡片常數命名使用日文羅馬拼音（如 MATSU、UME、SAKURA）+ 卡片特徵（如 HIKARI、INO、AKATAN）
