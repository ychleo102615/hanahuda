# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2025-01-17

### Added
- 排行榜與個人統計功能
- 將即時通訊從 SSE 遷移至 WebSocket
- WebSocket 安全性與多實例架構準備
- Telegram Mini App 認證整合
- 資料清理排程器強化
- NavigationSection 卡片化重設計

### Changed
- Opponent BC 獨立化並修正架構違反
- OpponentRegistry 從事件驅動改為請求驅動
- OAuth 架構重構並重命名 TelegramSdkAdapter
- 移除配對取消功能
- 移除 SSE 相關遺留程式碼
- 統一首頁為金箔蒔絵風格
- 首頁 Records 區塊套用金箔蒔絵風格
- 遊戲 Modal 統一為翠綠風格
- 清理 console logs 並統一使用 logger

### Fixed
- 修正排行榜與統計業務規則
- 修正排行榜與個人統計切換時的閃爍問題
- 修正重連時經過秒數顯示為 0 的問題
- 修復 Rematch 功能與遊戲結束後連線管理
- 修復遊戲開始延遲與重連狀態同步問題
- 修復 Lobby 房間選擇的玩家狀態檢查
- 加強 WebSocket 錯誤處理避免 unhandled rejection
- 新增全域錯誤處理器捕捉 ECONNRESET

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

[Unreleased]: https://github.com/ychleo102615/hanahuda/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/ychleo102615/hanahuda/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ychleo102615/hanahuda/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ychleo102615/hanahuda/releases/tag/v1.0.0
