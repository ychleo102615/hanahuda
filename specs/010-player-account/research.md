# Research: 玩家帳號功能技術研究

**Feature**: 010-player-account
**Date**: 2026-01-02
**Status**: Completed

## Summary

本文件記錄 Phase 0 技術研究階段的調查結果，針對 plan.md 中標記為 "NEEDS CLARIFICATION" 的項目提供明確決策與理由。

---

## 1. Session Store 實作方案

### Decision
**採用 In-memory + unstorage 抽象（MVP 階段），保留未來切換 Redis 的彈性**

### Rationale
1. **快速啟動**：無需額外基礎設施，專注核心遊戲邏輯
2. **抽象層保護**：使用 unstorage 介面，未來切換 Redis 僅需改配置
3. **符合規模需求**：單實例 + in-memory 足以應付 100+ 並發用戶的 MVP 規模
4. **成本為零**：不增加託管費用
5. **Clean Architecture 友善**：透過 Port/Adapter 隔離技術細節

### Alternatives Considered
| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| Redis（立即導入） | 可水平擴展、持久化 | MVP 階段過度複雜、增加成本 | 延後至擴展期 |
| 純 Map 實作 | 最簡單 | 無抽象層，未來切換成本高 | 不建議 |
| **unstorage 抽象** | 彈性高、切換無痛 | 略微增加初始複雜度 | **採用** |

### Implementation Notes
- 定義 `SessionOutputPort` 介面（Clean Architecture）
- 透過 unstorage 的 `memory` driver 實作 Adapter
- Session 設定 TTL（7 天滑動過期）
- 未來擴展時機：需要多實例部署或 session 持久化時切換 Redis

---

## 2. 密碼雜湊演算法

### Decision
**採用 bcryptjs（純 JavaScript 實作）**

### Rationale
1. **部署簡易性**：純 JavaScript，無需處理 node-gyp 編譯問題
2. **Nuxt 4 / Nitro 相容性**：Nitro 打包時對原生模組處理較複雜，bcryptjs 完全避免此問題
3. **安全性足夠**：bcrypt 仍是 OWASP 推薦的安全選項，對於花牌遊戲綽綽有餘
4. **效能差異可忽略**：密碼驗證是低頻操作（僅登入時），30% 效能差異無感知
5. **未來可升級**：若需要 Argon2，可漸進式遷移（登入時重新雜湊）

### Alternatives Considered
| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| bcrypt（原生） | 效能最佳 | 需編譯環境、Edge Runtime 不支援 | 不建議 |
| Argon2 | 安全性最高 | 需編譯環境、記憶體消耗高 | 延後考慮 |
| **bcryptjs** | 零原生依賴、跨平台 | 效能略慢 30% | **採用** |

### Configuration
- **Cost Factor**: 12（約 250ms，平衡安全與效能）
- **套件**: `bcryptjs`

---

## 3. OAuth Library 選擇

### Decision
**採用 Arctic（by Lucia）**

### Rationale
1. **符合專案需求**：內建 Google + Line 支援，無需額外設定
2. **Clean Architecture 友善**：僅處理 OAuth 流程，不綁定 session/database，符合分層設計
3. **輕量**：Bundle 小，啟動快
4. **型別安全**：完整 TypeScript 支援，符合專案標準
5. **維護活躍**：Lucia 作者持續更新，社群活躍
6. **未來擴展**：50+ Provider 足以應對大多數擴展需求

### Alternatives Considered
| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| H3 原生實作 | 完全控制 | 開發時間長、安全風險高 | 不建議 |
| @auth/nuxt | 全功能 | 過度抽象、黑箱行為、Nuxt 整合不穩定 | 不建議 |
| simple-oauth2 | 標準實作 | 無內建 Provider，設定繁瑣 | 不建議 |
| **Arctic** | 輕量、Provider 豐富、TypeScript 完整 | 需自行處理 Session | **採用** |

### Implementation Notes
- Arctic 官網：https://arctic.js.org/
- Google OAuth 2.0 + Line OAuth 2.1 皆有官方支援
- 搭配 H3 內建的 cookie 管理處理 Session

---

## 4. 訪客 ID 生成方案

### Decision
- **Player ID**：UUID v4（透過原生 `crypto.randomUUID()`）
- **訪客顯示名稱**：`Guest_XXXX` 格式（透過原生 `crypto.randomInt()` 實作）

### Rationale

#### Player ID 使用 UUID v4
1. **零依賴**：Node.js 原生支援
2. **唯一性保證**：122 bits 熵值，碰撞機率可忽略（10^-37 等級）
3. **標準格式**：業界廣泛使用，與資料庫、日誌系統相容
4. **分散式友善**：無需中央協調即可生成全域唯一 ID

#### 訪客名稱使用原生 crypto
1. **零依賴**：不需安裝 nanoid
2. **程式碼簡單**：約 5 行即可完成
3. **可讀性佳**：大寫字母避免 `l/1`、`O/0` 混淆

### Alternatives Considered
| 用途 | 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|------|
| Player ID | nanoid | 更短、URL-safe | 需依賴、非標準 | 不採用 |
| Player ID | **UUID v4** | 標準、零依賴、唯一 | 較長 | **採用** |
| 訪客名稱 | nanoid customAlphabet | 簡潔 | 需依賴 | 不採用 |
| 訪客名稱 | **crypto.randomInt** | 零依賴、可控 | 需自行實作 | **採用** |

### Configuration
- **Player ID 格式**：`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`（標準 UUID v4）
- **訪客名稱格式**：`Guest_XXXX`（大寫英文 + 數字，36 字元集）
- **訪客名稱碰撞**：可接受（1,679,616 組合，僅用於顯示，非唯一識別）

---

## 5. Session ID 生成

### Decision
**採用 crypto.randomBytes(32).toString('base64url')**

### Rationale
1. **安全性最高**：256 bits 熵值，超過 OWASP 建議的 64 bits 最低要求
2. **OWASP 首選**：crypto.randomBytes 是 OWASP 明確推薦的 Session ID 生成方式
3. **無格式洩漏**：純隨機，無可辨識模式（不同於 UUID 會洩漏版本資訊）
4. **URL-safe 編碼**：base64url 編碼，適合 Cookie 儲存

### Alternatives Considered
| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| UUID v4 | 標準、簡單 | 熵值較低（122 bits）、格式洩漏 | 可接受但非首選 |
| **crypto.randomBytes** | 熵值高、無模式、OWASP 首選 | 略複雜 | **採用** |

### Cookie 安全設定
| 屬性 | 生產環境 | 開發環境 |
|------|---------|---------|
| HttpOnly | true | true |
| Secure | true | false |
| SameSite | Lax | Lax |
| Path | / | / |
| Max-Age | 604800 (7天) | 604800 |

---

## 6. 技術決策總覽

| 項目 | 決策 | 套件/實作 |
|------|------|----------|
| Session Store | In-memory + unstorage | unstorage (memory driver) |
| 密碼雜湊 | bcrypt (純 JS) | bcryptjs |
| OAuth 套件 | Arctic | arctic |
| Player ID | UUID v4 | crypto.randomUUID() |
| 訪客名稱 | Guest_XXXX | crypto.randomInt() |
| Session ID | 256-bit random | crypto.randomBytes(32) |

---

## 7. 依賴清單（新增）

```json
{
  "dependencies": {
    "bcryptjs": "^3.0.0",
    "arctic": "^2.0.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^3.0.0"
  }
}
```

---

## References

1. OWASP Session Management Cheat Sheet
2. NIST SP 800-63B - Digital Identity Guidelines
3. Arctic Documentation: https://arctic.js.org/
4. bcryptjs npm: https://www.npmjs.com/package/bcryptjs
5. Nitro unstorage: https://nitro.unjs.io/guide/storage
