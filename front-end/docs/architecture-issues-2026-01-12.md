# 架構問題分析報告

**日期**: 2026-01-12
**分析範圍**: Telegram Mini App 整合後的架構檢查
**狀態**: 分析完成，待修復

---

## 問題清單

| # | 問題 | 嚴重程度 | 狀態 |
|---|------|---------|------|
| 1 | OAuthLoginUseCase 設計問題 | 🔴 Critical | ✅ 已修復 |
| 2 | Composable 直接 import Adapter | 🟠 High | 待修復 |
| 3 | TelegramSdkAdapter 命名不當 | 🟡 Medium | ✅ 已修復 |
| 4 | Container 暴露過多 Output Ports | 🔴 Critical | 待修復 |

---

## 問題 1：OAuthLoginUseCase 設計問題

### 問題描述

`OAuthLoginUseCase` 把應該在 Adapter 層的邏輯（OAuth code exchange、getUserInfo）包裝成了 UseCase，導致：

1. **OAuthLoginInput 知道太多 Provider 細節**
   ```typescript
   export interface OAuthLoginInput {
     provider: OAuthProviderPort
     code: string
     redirectUri?: string     // "某些 Provider 需要" ← Adapter 知識洩漏
     codeVerifier?: string    // "Google 需要" ← 具體 Provider 知識洩漏
   }
   ```

2. **UseCase 接收已建構的 Adapter 作為輸入**（反向依賴注入）
   ```typescript
   // 目前做法：API Endpoint 建構 Adapter，傳入 UseCase
   const provider = createGoogleOAuthProvider(...)
   await oauthLoginUseCase.execute({ provider, code, ... })
   ```

3. **UseCase 呼叫 Adapter 方法**（職責錯置）
   ```typescript
   // OAuthLoginUseCase.execute() 內部
   const tokenResult = await provider.exchangeCode({ code, ... })
   const oauthUserInfo = await provider.getUserInfo(tokenResult.accessToken)
   ```

### 對比 Telegram 的正確實作

```typescript
// verify.post.ts (API Endpoint - Adapter Layer)
const validationResult = telegramValidator.validate(body.initData)  // Adapter 做驗證
const loginResult = await externalAuthLoginUseCase.execute({        // 直接呼叫 UseCase
  userInfo: validationResult.userInfo,  // 傳入抽象 DTO
})
```

### 建議修復方向

**OAuthLoginUseCase 應該被移除**，OAuth code exchange 邏輯應該在 Adapter 層：

```
目前（錯誤）:
API Endpoint → OAuthLoginUseCase.execute(provider, code)
                    ↓
              provider.exchangeCode()  ← UseCase 呼叫 Adapter？
              provider.getUserInfo()
                    ↓
              externalAuthLoginUseCase.execute()

修復後（正確）:
API Endpoint → GoogleOAuthAdapter.exchangeAndGetUser(code) → ExternalUserInfo
            → externalAuthLoginUseCase.execute(userInfo)
```

### 影響檔案

- `server/identity/application/use-cases/oauth-login-use-case.ts` - 移除或重構
- `server/identity/adapters/di/container.ts` - 移除 OAuthLoginUseCase
- `server/api/v1/auth/oauth/google/callback.get.ts` - 重構為直接呼叫 Adapter + UseCase
- `server/api/v1/auth/oauth/line/callback.get.ts` - 同上

---

## 問題 2：Composable 直接 Import Adapter

### 問題描述

```typescript
// useTelegram.ts
import { getTelegramAuthAdapter } from '~/game-client/adapter/api/TelegramAuthAdapter'

const authAdapter = getTelegramAuthAdapter()  // 直接取得 Adapter 實例
await authAdapter.verify(initData)            // 繞過 Port 抽象
```

### 問題

- UI Layer (Composable) 直接 import Adapter Layer
- 繞過了 Port 抽象
- 測試時難以 Mock

### 建議修復方向

透過 DI 取得 Port（不是 Adapter）：
```typescript
const authPort = useNuxtApp().$telegramAuthPort as TelegramAuthPort
await authPort.verify(initData)
```

### 影響檔案

- `app/composables/useTelegram.ts`
- `app/plugins/02.telegram-webapp.client.ts` - 註冊 Port 到 DI

---

## 問題 3：TelegramSdkAdapter 命名不當 ✅ 已修復

### 問題描述

`TelegramSdkAdapter` 沒有實作任何 Port，也沒有注入任何 Port，它只是一個 SDK Wrapper。

根據 CA 定義：
- Driven Adapter: `implements OutputPort`
- Driving Adapter: 持有並呼叫 `InputPort`
- `TelegramSdkAdapter`: 兩者皆無 ❌

### 修復方式

選擇選項 A：重新命名為 `TelegramSdkClient`

- `TelegramSdkAdapter.ts` → `TelegramSdkClient.ts`
- 類別名 `TelegramSdkAdapter` → `TelegramSdkClient`
- 工廠函數 `getTelegramSdkAdapter()` → `getTelegramSdkClient()`

### 已修改檔案

- `app/game-client/adapter/telegram/TelegramSdkClient.ts` (原 TelegramSdkAdapter.ts)
- `app/composables/useTelegram.ts`
- `app/plugins/02.telegram-webapp.client.ts`

---

## 問題 4：Container 暴露過多 Output Ports

### 問題描述

```typescript
export interface IdentityContainer {
  // ❌ Output Ports - 不應暴露給外部
  playerRepository: PlayerRepositoryPort       // 1
  accountRepository: AccountRepositoryPort     // 2
  oauthLinkRepository: OAuthLinkRepositoryPort // 3
  sessionStore: SessionStorePort               // 4
  passwordHasher: PasswordHashPort             // 5

  // ✅ Input Ports (UseCases) - 應該暴露
  createGuestUseCase: CreateGuestUseCase
  // ...
}
```

### 誰在使用這些 Output Ports？

| 使用者 | 存取的 Port | 問題 |
|--------|------------|------|
| `guestCleanup.ts` (Plugin) | `playerRepository.deleteInactiveGuests()` | Plugin 直接操作 Repository |
| `identityPortAdapter.ts` (Core-Game BC) | `sessionStore.findById()` | 跨 BC 直接存取 Output Port |

### 建議修復方向

1. **guestCleanup.ts**: 建立 `CleanupInactiveGuestsUseCase`，Plugin 呼叫 UseCase

2. **identityPortAdapter.ts**: Identity BC 提供 `ValidateSessionUseCase`，Core-Game BC 透過它取得 playerId

3. **Container 拆分**:
   ```typescript
   // 對外暴露（跨 BC 使用）
   export interface IdentityContainerPublic {
     validateSessionUseCase: ValidateSessionUseCase
     // ... 其他 UseCases
   }

   // 內部使用（僅 Identity BC）
   interface IdentityContainerInternal extends IdentityContainerPublic {
     playerRepository: PlayerRepositoryPort
     // ...
   }
   ```

### 影響檔案

- `server/identity/adapters/di/container.ts`
- `server/identity/application/use-cases/` - 新增 UseCase
- `server/plugins/guestCleanup.ts`
- `server/core-game/adapters/identity/identityPortAdapter.ts`

---

## 修復優先順序

1. **問題 1 (OAuthLoginUseCase)** - 核心架構問題，影響後續設計
2. **問題 4 (Container 暴露 Output Ports)** - 跨 BC 邊界問題
3. **問題 2 (Composable import Adapter)** - 前端架構問題
4. **問題 3 (TelegramSdkAdapter 命名)** - 命名問題，影響較小
