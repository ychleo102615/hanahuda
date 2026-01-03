# Security Requirements Quality Checklist: 玩家帳號功能

**Purpose**: Post-implementation review - 驗證安全需求的完整性、清晰度與一致性
**Created**: 2026-01-03
**Feature**: [spec.md](../spec.md)
**Focus**: Security (密碼儲存、Session 管理、OAuth、Cookie 設定)
**Depth**: Standard

---

## Password Security Requirements

- [ ] CHK001 - 密碼雜湊演算法是否有明確指定（如 bcrypt, argon2）？ [Clarity, Spec §FR-003]
- [ ] CHK002 - 密碼強度規則（8+ 字元、含字母與數字）是否在需求中明確定義而非僅在 Assumptions？ [Completeness, Assumptions]
- [ ] CHK003 - 密碼驗證失敗的回應訊息是否被定義為不洩漏帳號存在與否？ [Clarity, Spec §US5]
- [ ] CHK004 - 密碼重設流程需求是否有定義（或明確標註為後續迭代）？ [Gap]

## Session Management Requirements

- [ ] CHK005 - Session ID 的產生方式是否有安全要求規範（如熵值、長度）？ [Gap, Spec §FR-012]
- [ ] CHK006 - 滑動過期機制的觸發條件是否明確定義（每次請求 vs 特定 API）？ [Clarity, Spec §FR-012]
- [ ] CHK007 - Session 無效化情境是否完整列出（登出、過期、密碼變更後）？ [Completeness, Spec §FR-013]
- [ ] CHK008 - 多裝置同時登入的 Session 策略是否有定義？ [Gap]
- [ ] CHK009 - Session Store 的實作策略是否有安全考量（記憶體 vs 持久化）？ [Gap, Spec §FR-012]

## Cookie Security Requirements

- [ ] CHK010 - HTTP-only Cookie 設定是否在所有相關 FR 中一致要求？ [Consistency, Spec §FR-008, FR-012]
- [ ] CHK011 - Cookie 的 Secure flag（僅 HTTPS）需求是否有明確定義？ [Gap]
- [ ] CHK012 - Cookie 的 SameSite 屬性需求是否有明確定義？ [Gap]
- [ ] CHK013 - 訪客 Cookie（30 天）與 Session Cookie（7 天）的有效期差異是否有合理說明？ [Clarity, Spec §FR-008, FR-012]

## OAuth Security Requirements

- [ ] CHK014 - OAuth 2.0/2.1 的 PKCE 流程是否在需求中明確要求？ [Gap, Spec §FR-004, FR-005]
- [ ] CHK015 - OAuth state 參數（CSRF 防護）是否在需求中明確要求？ [Gap, Spec §FR-004, FR-005]
- [ ] CHK016 - OAuth Token 的儲存與處理安全要求是否有定義？ [Gap]
- [ ] CHK017 - OAuth Provider 服務中斷時的錯誤處理需求是否足夠具體？ [Clarity, Edge Cases]
- [ ] CHK018 - OAuth 帳號連結時的密碼驗證流程安全要求是否明確？ [Clarity, Spec §FR-006b]

## Authentication Logging Requirements

- [ ] CHK019 - 登入失敗日誌的記錄欄位（時間戳、IP、帳號）是否完整？ [Completeness, Spec §FR-013a]
- [ ] CHK020 - 登入失敗日誌的敏感資料處理方式是否有定義（如不記錄密碼）？ [Gap, Spec §FR-013a]
- [ ] CHK021 - 登入成功事件是否也需要記錄（審計追蹤）？ [Gap]
- [ ] CHK022 - 日誌保留期限與存取權限是否有定義？ [Gap]

## Input Validation Requirements

- [ ] CHK023 - 帳號名稱規則（3-20 字元、英數底線）是否在 FR 中明確定義而非僅在 Assumptions？ [Completeness, Assumptions]
- [ ] CHK024 - 輸入驗證是否同時在前端與後端執行的需求是否明確？ [Clarity, Spec §FR-017]
- [ ] CHK025 - SQL Injection、XSS 等攻擊防護需求是否有定義？ [Gap]

## Rate Limiting & Brute Force Protection

- [ ] CHK026 - Rate Limiting 明確標註為後續迭代，但是否有定義觸發條件的預期規格？ [Clarity, Assumptions]
- [ ] CHK027 - 帳號鎖定機制的預期行為是否有初步定義（即使後續實作）？ [Gap, Assumptions]

## Data Protection Requirements

- [ ] CHK028 - 訪客資料清理（90 天）的執行頻率與方式是否明確？ [Clarity, Spec §FR-010a]
- [ ] CHK029 - 玩家資料刪除時關聯資料的處理方式是否完整定義？ [Completeness, Spec §FR-010a]
- [ ] CHK030 - 敏感資料（密碼、OAuth Token）的傳輸加密需求是否有定義？ [Gap]

---

## Summary

| Category | Items | Key Gaps Identified |
|----------|-------|---------------------|
| Password Security | 4 | 雜湊演算法未明確指定、密碼重設流程未定義 |
| Session Management | 5 | Session ID 安全要求、多裝置策略未定義 |
| Cookie Security | 4 | Secure/SameSite flags 未明確定義 |
| OAuth Security | 5 | PKCE/state 防護未在需求中明確 |
| Auth Logging | 4 | 敏感資料處理、保留期限未定義 |
| Input Validation | 3 | 攻擊防護需求未定義 |
| Rate Limiting | 2 | 預期規格未初步定義 |
| Data Protection | 3 | 傳輸加密需求未定義 |

**Total Items**: 30
