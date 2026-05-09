## 1. 刪除空殘留目錄

- [x] 1.1 刪除 `server/matchmaking/adapters/registry/__tests__/`（空目錄）
- [x] 1.2 刪除 `server/matchmaking/application/use-cases/__tests__/`（空目錄）

## 2. 重新命名 server/opponent/adapter → adapters

- [x] 2.1 將 `server/opponent/adapter/` 目錄重新命名為 `server/opponent/adapters/`
- [x] 2.2 更新 `server/opponent/adapters/scheduler/aiActionScheduler.ts` 內的所有 import 路徑
- [x] 2.3 更新 `server/opponent/adapters/di/container.ts` 內的所有 import 路徑
- [x] 2.4 更新 `server/opponent/adapters/event-handler/aiNeededHandler.ts` 內的所有 import 路徑
- [x] 2.5 更新 `server/opponent/adapters/store/opponentStore.ts` 內的所有 import 路徑
- [x] 2.6 更新 `server/opponent/adapters/state/opponentStateTracker.ts` 內的所有 import 路徑
- [x] 2.7 更新 `server/opponent/adapters/ai/opponentInstance.ts` 內的所有 import 路徑
- [x] 2.8 更新 `server/core-game/adapters/event-publisher/compositeEventPublisher.ts` 中引用 `opponent/adapter` 的 import 路徑
- [x] 2.9 更新 `server/opponent/index.ts` 中引用 `adapter/di/container` 的 export 路徑

## 3. 重新命名 app/shared/adapters → adapter

- [x] 3.1 將 `app/shared/adapters/` 目錄重新命名為 `app/shared/adapter/`
- [x] 3.2 更新 `app/identity/adapter/components/LoginForm.vue` 中引用 `shared/adapters` 的 import 路徑
- [x] 3.3 更新 `app/game-client/adapter/composables/usePageVisibility.ts` 中引用 `shared/adapters` 的 import 路徑
- [x] 3.4 更新 `app/game-client/adapter/stores/gameState.ts` 中引用 `shared/adapters` 的 import 路徑
- [x] 3.5 更新 `app/shared/index.ts` 中如有引用 `adapters/` 的路徑

## 4. 移動 private-room API 路由至 v1/

- [x] 4.1 在 `server/api/v1/` 下建立 `private-room/` 目錄
- [x] 4.2 移動 `server/api/private-room/create.post.ts` → `server/api/v1/private-room/create.post.ts`
- [x] 4.3 建立 `server/api/v1/private-room/[roomId]/` 目錄，移動以下三個檔案：
  - `server/api/private-room/[roomId]/join.post.ts`
  - `server/api/private-room/[roomId]/dissolve.post.ts`
  - `server/api/private-room/[roomId]/status.get.ts`
- [x] 4.4 刪除舊的 `server/api/private-room/` 目錄（確認已全部移動後）
- [x] 4.5 更新 `app/pages/room/[roomId].vue` 中所有 `/api/private-room/` 呼叫 → `/api/v1/private-room/`
- [x] 4.6 更新 `app/pages/lobby/index.vue` 中所有 `/api/private-room/` 呼叫 → `/api/v1/private-room/`
- [x] 4.7 更新 `app/pages/game/components/MatchmakingStatusOverlay.vue` 中所有 `/api/private-room/` 呼叫 → `/api/v1/private-room/`

## 5. 遷移 Telegram 認證叢集至 identity BC

- [x] 5.1 移動 `app/game-client/application/ports/output/telegram-auth.port.ts` → `app/identity/application/ports/output/telegram-auth.port.ts`
- [x] 5.2 移動 `app/game-client/adapter/api/TelegramAuthAdapter.ts` → `app/identity/adapter/api/TelegramAuthAdapter.ts`（更新內部 import 路徑指向新的 port 位置）
- [x] 5.3 移動 `app/game-client/adapter/telegram/TelegramSdkClient.ts` → `app/identity/adapter/telegram/TelegramSdkClient.ts`
- [x] 5.4 移動 `app/composables/useTelegram.ts` → `app/identity/adapter/composables/useTelegram.ts`（更新內部 import 路徑）
- [x] 5.5 從 `app/game-client/application/ports/output/index.ts` 移除 `TelegramAuthPort` 相關 export
- [x] 5.6 更新 `app/plugins/02.telegram-webapp.client.ts` 的 import（`game-client/adapter/telegram/TelegramSdkClient` → `identity/adapter/telegram/TelegramSdkClient`）
- [x] 5.7 更新 `app/middleware/auth.global.ts` 中的 `useTelegram` import 路徑
- [x] 5.8 更新 `app/components/menu/ResponsiveMenu.vue` 中的 `useTelegram` import 路徑
- [x] 5.9 更新 `app/pages/index/components/PlayerProfilePopover.vue` 中的 `useTelegram` import 路徑
- [x] 5.10 更新 `app/pages/index/components/NavigationBar.vue` 中的 `useTelegram` import 路徑

## 6. 移動 core-game 測試至正確目錄

- [x] 6.1 建立 `tests/server/core-game/` 目錄結構
- [x] 6.2 移動 `tests/server/adapters/` → `tests/server/core-game/adapters/`
- [x] 6.3 移動 `tests/server/application/` → `tests/server/core-game/application/`
- [x] 6.4 移動 `tests/server/domain/` → `tests/server/core-game/domain/`
- [x] 6.5 移動 `tests/server/fixtures/` → `tests/server/core-game/fixtures/`
- [x] 6.6 移動 `tests/server/mocks/` → `tests/server/core-game/mocks/`
- [x] 6.7 更新所有移動後的測試檔案中 `../../fixtures` 與 `../../mocks` 相對路徑

## 7. 刪除腳手架殘留與空 BC

- [x] 7.1 刪除整個 `app/user-interface/` 目錄（含所有空子目錄）
- [x] 7.2 刪除整個 `app/stores/` 目錄（含 `counter.ts`）

## 8. 驗證

- [x] 8.1 執行 `pnpm --prefix front-end lint` 確認無 import 路徑錯誤
- [x] 8.2 執行 `pnpm --prefix front-end test:unit` 確認所有單元測試通過
- [x] 8.3 確認以下路徑均已不存在：
  - `server/opponent/adapter/`
  - `app/shared/adapters/`
  - `server/api/private-room/`
  - `app/composables/useTelegram.ts`
  - `app/game-client/application/ports/output/telegram-auth.port.ts`
  - `app/game-client/adapter/api/TelegramAuthAdapter.ts`
  - `app/game-client/adapter/telegram/TelegramSdkClient.ts`
  - `app/user-interface/`
  - `app/stores/`
  - `server/matchmaking/adapters/registry/__tests__/`
  - `server/matchmaking/application/use-cases/__tests__/`
