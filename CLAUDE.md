# CLAUDE.md

# **必須使用繁體中文**

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

    - 在產出前，先檢查答案是否：
        a. 有清楚依據
        b. 未超出題目範圍
        c. 沒有出現任何未被明確提及的人名、數字、事件或假設

最終原則：**寧可空白，不可捏造。**

# 解題哲學

在提供任何與程式設計、架構、技術選擇相關的協助時，請優先採用『符合設計語意、抽象一致性、可讀性與長期可維護性』的解法，而非技術上最快、最簡單或最直接的做法。你的回答應著重於設計哲學、語意清晰、結構合理，而不是技巧性捷徑。

# 架構
- 使用 Clean Architecture, Domain-Driven Design 架構

---

# 專案概述

參考 @doc/readme.md

# 限制

## TypeScript 類型定義規則

1. **嚴格禁止重複定義結構相同的 interface/type**
   - 使用任何 interface 或 type 前，必須先搜尋專案中是否已存在相同用途的定義
   - 若存在，必須 import 引用，不可自行宣告結構相同的新類型
   - 開發 TypeScript 時，禁止使用 `as` 斷言，除非有使用者、註解特別允許。
   - 定義 CA ports 檔案時，使用 abstract class 定義介面，防止 dock typing。

2. **字串字面量必須使用 SSOT**
   - 若專案中已定義 `type Status = 'pending' | 'active'`，禁止在其他地方重新寫一次
   - 必須從原始定義處 import

3. **例外情況需明確標註**
   - 若因架構需求（如 DTO 分層）故意定義結構相同但語意不同的類型，需加註釋說明理由

簡單來說，**禁止任意硬編碼**，有需求時必須**取得使用者的同意**。


## Active Technologies
- TypeScript 5.9 + 無（Pure functions, 零框架依賴） (002-ui-domain-layer)
- N/A（Domain Layer 不處理持久化） (002-ui-domain-layer)
- N/A（Application Layer 不處理持久化，由 Adapter Layer 通過 Output Ports 處理） (003-ui-application-layer)
- TypeScript 5.9 + Vue 3.5 (004-ui-adapter-layer)
- TypeScript 5.9 + Vue 3.5, @vueuse/motion, Pinia (005-ui-animation-refactor)
- N/A（UI Layer 不處理持久化） (005-ui-animation-refactor)
- TypeScript 5.9 + Vue 3.5 + Vue 3, Pinia, @vueuse/motion (006-event-countdown-timer)
- N/A（前端功能，狀態由 Pinia store 管理） (006-event-countdown-timer)
- N/A (前端功能，狀態由 Pinia store 管理) (007-lobby-settings-panel)
- TypeScript 5.9 + Nuxt 4 (Nitro), Drizzle ORM, Zod, H3 (008-nuxt-backend-server)
- PostgreSQL 14+ (Drizzle ORM) (008-nuxt-backend-server)

## Recent Changes
- 003-ui-application-layer: Added TypeScript 5.9 + 無（Pure functions, 零框架依賴）
- 002-ui-domain-layer: Added TypeScript 5.9 + 無（Pure functions, 零框架依賴）
