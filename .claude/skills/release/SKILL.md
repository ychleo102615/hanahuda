# Release Skill

自動化版本發布流程，包含版本號計算、CHANGELOG 生成、README 更新。

## 觸發方式

```
/release
```

## 執行流程

### Step 1: 分析變更

1. 取得最新的 git tag（格式：`vX.Y.Z`）
2. 分析從該 tag 到 HEAD 的所有 commits
3. 根據 Conventional Commits 分類：

```
feat:     → 新功能
fix:      → 錯誤修復
perf:     → 效能改善
refactor: → 重構
style:    → 樣式調整
docs:     → 文件更新
test:     → 測試
chore:    → 雜項
```

### Step 2: 計算新版本號

基於 SemVer，自動決定版本升級：

```
BREAKING CHANGE 或 feat!: → MAJOR (X+1.0.0)
feat:                     → MINOR (X.Y+1.0)
fix/perf/refactor:        → PATCH (X.Y.Z+1)
其他 (style/docs/chore):  → PATCH (僅當無其他變更時)
```

**取最高級別的變更作為升級依據**

### Step 3: 生成 CHANGELOG 條目

按照 Keep a Changelog 格式，分類整理變更：

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- feat 類型的變更

### Changed
- refactor/perf/style 類型的變更

### Fixed
- fix 類型的變更

### Removed
- 移除功能的變更（從 commit message 中識別）
```

**注意事項**：
- 合併 commit（Merge pull request）應被跳過
- docs/test/chore 類型不列入 CHANGELOG（除非是重要變更）
- 變更描述使用繁體中文

### Step 4: 全面檢視 README（必須詢問用戶）

**4.1 必要更新（自動執行）**：
- 更新版本區塊（Quick Start 上方）
- 更新 Bounded Contexts 表格（如有新增/重命名 BC）
- 更新 Future Plans（勾選已完成項目）

**4.2 建議更新（必須詢問用戶）**：

逐一檢視以下區塊，根據本次變更內容判斷是否需要更新：

| 區塊 | 檢視重點 |
|------|----------|
| **Project Highlights** | 新功能是否值得列為亮點？ |
| **Tech Stack** | 是否有新增技術或框架？ |
| **Core Feature Implementations** | 是否需要新增章節說明重要功能？ |
| **Key Technical Decisions** | 是否有重要的架構決策需要記錄？ |
| **Project Structure** | 目錄結構是否有重大變更？ |

**4.3 詢問用戶**：

使用 AskUserQuestion 工具，列出所有建議的更新項目：

```
根據本次變更，我建議以下 README 更新：

1. [Project Highlights] 新增「Matchmaking」和「Identity」亮點
2. [Core Features] 新增「Online Matchmaking System」章節
3. [Key Decisions] 新增「PlayerEventBus 設計」說明

請選擇要套用的更新：
- 全部套用
- 選擇性套用（請指定編號）
- 跳過，只更新必要區塊
```

**重要**：必須等待用戶回覆後，才能進入 Step 5。

### Step 5: 更新檔案

1. 更新 `front-end/package.json` 的 version 欄位
2. 在 `CHANGELOG.md` 頂部插入新版本條目
3. 更新 `README.md` 版本區塊
4. 更新 CHANGELOG 底部的連結

### Step 6: 創建 Release Commit

```bash
git add CHANGELOG.md README.md front-end/package.json
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
```

### Step 7: 觸發 Hooks（預留）

檢查 `scripts/hooks/` 目錄下是否有 release notifier：
- 如果有，載入並執行通知
- 如果沒有，跳過此步驟

---

## 版本區塊格式

在 README.md 的 Quick Start 上方插入：

```markdown
---

## Current Version

**v1.2.0** (2025-01-12)

### Recent Changes
- 新增線上配對功能
- 改善配對錯誤處理
- 修復手牌可見性安全問題

[View Full Changelog](./CHANGELOG.md)

---
```

## 輸出格式

完成後輸出摘要：

```
## Release Summary

**Version**: v1.2.0 (from v1.1.0)
**Date**: 2025-01-12

### Changes Included
- 5 features
- 8 fixes
- 3 refactors

### Files Updated
- CHANGELOG.md
- README.md
- front-end/package.json

### Next Steps
1. Review the changes: `git diff HEAD~1`
2. Push to remote: `git push origin develop && git push --tags`
3. Create PR from develop to main
```

## 重要提醒

- 使用繁體中文撰寫 CHANGELOG 內容
- 遵循 Keep a Changelog 格式
- 確保版本號遵循 SemVer
- 不要修改歷史版本的 CHANGELOG 條目
- Tag 格式統一為 `vX.Y.Z`
