# 指標與標準

## 概述

本文檔定義專案的成功指標、效能標準與程式碼品質標準。

---

## MVP 階段指標

### 功能完整度

- ✅ 100% 實作所有 MVP 功能需求
- ✅ 12 種常用役種正確檢測（光牌系 4 種、短冊系 3 種、種牌系 4 種、かす系 1 種）
- ✅ 遊戲流程無阻塞性 Bug
- ✅ 支援離線單機模式（Local Game BC）
- ✅ 支援線上對戰模式（Core Game BC + 後端）

---

### 技術指標

#### 後端效能

| 指標 | 目標值 | 測量方式 |
|------|--------|---------|
| API 回應時間 (P95) | < 500ms | Spring Boot Actuator / Prometheus |
| API 回應時間 (P99) | < 1s | Spring Boot Actuator / Prometheus |
| SSE 事件推送延遲 | < 100ms | 自訂計時器 |
| 並發遊戲數 | 100+ | JMeter / Gatling 負載測試 |
| 對手操作計算時間 | < 1s | 單元測試計時 |

#### 前端效能

| 指標 | 目標值 | 測量方式 |
|------|--------|---------|
| 首次內容繪製 (FCP) | < 1.5s | Lighthouse |
| 最大內容繪製 (LCP) | < 2.5s | Lighthouse |
| 首次輸入延遲 (FID) | < 100ms | Lighthouse |
| 累積版面配置位移 (CLS) | < 0.1 | Lighthouse |
| Lighthouse 整體評分 | > 90 | Lighthouse CI |

#### 測試覆蓋率

| 層級 | 前端目標 | 後端目標 | 測量方式 |
|------|---------|---------|---------|
| Domain Layer | > 90% | > 90% | c8 (Vitest) / JaCoCo |
| Application Layer | > 80% | > 80% | c8 (Vitest) / JaCoCo |
| Adapter Layer | > 60% | > 70% | c8 (Vitest) / JaCoCo |
| **整體** | **> 70%** | **> 80%** | c8 (Vitest) / JaCoCo |

---

### 使用者體驗指標

| 指標 | 目標值 | 測量方式 |
|------|--------|---------|
| 新手完成首場遊戲時間 | < 5 分鐘 | 使用者測試 |
| 規則清晰度評分 | > 4/5 | 使用者問卷 |
| 無重大 UI/UX 問題回報 | 0 | 內部測試 |
| 跨瀏覽器相容性 | Chrome, Firefox, Safari, Edge 100% | 手動測試 |
| 響應式設計 | 手機、平板、桌面 100% | 手動測試 |

---

### 程式碼品質指標

#### SonarQube 標準

| 指標 | 目標值 |
|------|--------|
| Critical Issues | 0 |
| High Issues | 0 |
| Code Smells | < 10 |
| Technical Debt Ratio | < 5% |
| Duplicated Lines | < 3% |
| Maintainability Rating | A |
| Reliability Rating | A |
| Security Rating | A |

#### Clean Architecture 檢查清單

- ✅ Domain Layer 不依賴任何框架
- ✅ Application Layer 只依賴 Domain Layer
- ✅ Use Case 不包含技術細節（如 JPA annotations）
- ✅ API Response 使用 DTO，不直接返回 Domain Model
- ✅ Repository 介面定義在 Domain Layer，實作在 Adapter Layer
- ✅ 所有業務邏輯在 Domain Layer，Use Case 只負責編排
- ✅ DTO ↔ Domain Model 轉換在 Adapter Layer 完成

#### 前端程式碼品質

- ✅ ESLint: 0 Errors, < 5 Warnings
- ✅ TypeScript Strict Mode: 啟用
- ✅ Type Coverage: > 95%
- ✅ 無 `any` 類型使用（除特殊情況）
- ✅ 所有組件有 Props 型別定義

#### 後端程式碼品質

- ✅ Checkstyle: 0 Violations
- ✅ PMD: 0 Violations
- ✅ SpotBugs: 0 Bugs
- ✅ 所有 Public API 有 Javadoc
- ✅ 遵循 Google Java Style Guide

---

## 文檔完整性

### 必備文檔

- ✅ README.md（專案概述、安裝指南、開發指南）
- ✅ API 文檔（Swagger / OpenAPI 3.0）
- ✅ 架構文檔（本目錄所有文檔）
- ✅ 遊戲規則說明（面向使用者）
- ✅ 開發者指南（如何擴展功能）

### 文檔品質標準

- ✅ 所有文檔使用繁體中文
- ✅ 技術術語一致性（例如：「役種」統一使用，不混用「役型」）
- ✅ 所有程式碼範例可執行
- ✅ 所有連結有效
- ✅ 版本號與修訂歷史清晰

---

## Git 提交規範

### Conventional Commits

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

**格式**: `<type>(<scope>): <subject>`

**Type**:
- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文檔更新
- `style`: 程式碼格式（不影響功能）
- `refactor`: 重構（不新增功能、不修復 Bug）
- `test`: 測試相關
- `chore`: 雜項（建置、依賴更新）

**範例**:
```
feat(game): implement Koi-Koi decision logic
fix(api): handle null session token in join endpoint
docs(readme): update installation instructions
refactor(domain): simplify Yaku detection logic
test(yaku): add test cases for GOKO detection
```

---

## 部署前檢查清單

### 功能檢查

- ✅ 所有 MVP 功能完整實作
- ✅ 所有測試通過（單元、整合、E2E）
- ✅ 手動測試通過（完整遊戲流程）

### 效能檢查

- ✅ Lighthouse 評分 > 90
- ✅ API 回應時間達標
- ✅ SSE 推送延遲達標
- ✅ 負載測試通過（100+ 並發遊戲）

### 安全性檢查

- ✅ OWASP Top 10 檢查通過
- ✅ 無已知安全漏洞（npm audit / Maven dependency-check）
- ✅ HTTPS 強制啟用（生產環境）
- ✅ CORS 正確配置
- ✅ Input Validation 完整

### 相容性檢查

- ✅ 跨瀏覽器測試通過（Chrome, Firefox, Safari, Edge）
- ✅ 響應式設計測試通過（手機、平板、桌面）
- ✅ SSE 降級機制測試通過（Fallback 短輪詢）

### 文檔檢查

- ✅ README.md 完整
- ✅ API 文檔完整（Swagger UI）
- ✅ 使用者手冊完整
- ✅ 版權聲明正確

---

## 監控與告警

### 生產環境監控（未來擴展）

- **應用效能監控 (APM)**: New Relic / Datadog
- **日誌聚合**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **指標收集**: Prometheus + Grafana
- **分散式追蹤**: Zipkin / Jaeger

### 告警規則

- API 錯誤率 > 5%
- API P95 回應時間 > 1s
- SSE 連線失敗率 > 10%
- 資料庫連線池耗盡
- 記憶體使用率 > 80%
- CPU 使用率 > 80%

---

## 參考文檔

- [測試策略](./testing-strategy.md)
- [前端架構總覽](../frontend/architecture.md)
- [後端架構總覽](../backend/architecture.md)
- [專案概述](../readme.md)
