# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-01-12

### Added
- 線上配對功能（人類對戰與 AI 對戰）
- 玩家帳號系統（註冊、登入、訪客模式）
- 帳號軟刪除機制
- 側邊選單共用元件
- Lobby 頁面與房間類型選擇
- 配對錯誤處理與 MatchmakingErrorModal
- CA/DDD 架構檢查與 BC 建立 skills
- /release skill 版本管理機制
- develop 分支 CI 與本地測試工具

### Changed
- 重命名 user-interface BC 為 game-client
- 建立 Shared Kernel 共用模組
- 重構 SessionContext 移除不需要的欄位
- 重新設計牌背為菊花紋章並增強牌堆堆疊效果
- 套用金箔蒔絵設計系統至 Modal 與 UI 元件
- 首頁豐富化與視覺優化

### Fixed
- 修正手牌可見性安全問題，對手手牌不再外洩
- 修正雙人對戰時兩個前端顯示相同視角的問題
- 修正雙人配對時 Player2 無法加入遊戲的問題
- 修復大廳下拉選單被卡片容器遮住的 z-index 問題
- 修復 Gateway SSE 斷線重連與遊戲狀態管理
- 修復遊戲結束面板關閉行為與 Rematch 按鈕狀態
- 修正配對畫面計時器與佈局問題
- 修正選牌後得役種時的動畫問題
- 修正 selecttionRequired 時配對役種沒有被判定獲得的問題

## [1.0.0] - 2024-12-01

### Added
- Initial release of Hanafuda Koi-Koi Web Game
- Complete game rule engine with 12 Yaku types
- SSE-based real-time communication
- AI opponent system
- Clean Architecture and DDD implementation
- PostgreSQL persistence with Drizzle ORM
- Interruptible animation system
- Reconnection and state recovery mechanism

[Unreleased]: https://github.com/ychleo102615/hanahuda/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/ychleo102615/hanahuda/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ychleo102615/hanahuda/releases/tag/v1.0.0
