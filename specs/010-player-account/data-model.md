# Data Model: 玩家帳號功能

**Feature**: 010-player-account
**Date**: 2026-01-02
**Status**: Draft

## Overview

本文件定義 Identity Bounded Context 的資料模型，包含後端領域模型與資料庫 Schema。

---

## 1. Domain Model

### 1.1 Player (Aggregate Root)

玩家身份的聚合根，統一管理訪客與註冊玩家。

```typescript
// server/identity/domain/player/player.ts

interface Player {
  readonly id: PlayerId           // UUID v4
  readonly displayName: string    // 顯示名稱（訪客: Guest_XXXX, 註冊: 帳號名稱）
  readonly isGuest: boolean       // 是否為訪客
  readonly createdAt: Date
  readonly updatedAt: Date
}

// Value Object
type PlayerId = string & { readonly _brand: unique symbol }
```

**Validation Rules**:
- `id`: 必須為有效 UUID v4
- `displayName`: 1-50 字元
- 訪客名稱格式: `Guest_XXXX`（4 位大寫英數字）

**State Transitions**:
- `Guest → Registered`: 當訪客完成註冊，`isGuest` 變為 false，`displayName` 更新為帳號名稱

---

### 1.2 Account (Entity)

已註冊的帳號資訊，與 Player 為 1:1 關係。

```typescript
// server/identity/domain/account/account.ts

interface Account {
  readonly id: AccountId          // UUID v4
  readonly playerId: PlayerId     // 關聯的 Player
  readonly username: string       // 帳號名稱（唯一）
  readonly email: string | null   // Email（選填）
  readonly passwordHash: PasswordHash  // 密碼雜湊
  readonly createdAt: Date
  readonly updatedAt: Date
}

// Value Object
type AccountId = string & { readonly _brand: unique symbol }

interface PasswordHash {
  readonly hash: string           // bcrypt 雜湊值
  readonly algorithm: 'bcrypt'    // 演算法標記（未來升級用）
}
```

**Validation Rules**:
- `username`: 3-20 字元，僅允許英文字母、數字、底線 (`/^[a-zA-Z0-9_]{3,20}$/`)
- `email`: 有效 Email 格式或 null
- `passwordHash.hash`: bcrypt 格式（`$2b$...`）

**Uniqueness Constraints**:
- `username` 全域唯一
- `email` 若非 null 則全域唯一
- `playerId` 唯一（一個 Player 只能有一個 Account）

---

### 1.3 OAuthLink (Entity)

OAuth 綁定關係，支援多個 Provider 連結至同一 Account。

```typescript
// server/identity/domain/oauth-link/oauth-link.ts

interface OAuthLink {
  readonly id: OAuthLinkId        // UUID v4
  readonly accountId: AccountId   // 關聯的 Account
  readonly provider: OAuthProvider
  readonly providerUserId: string // Provider 的使用者 ID
  readonly providerEmail: string | null  // Provider 提供的 Email
  readonly createdAt: Date
}

type OAuthLinkId = string & { readonly _brand: unique symbol }

type OAuthProvider = 'google' | 'line'
```

**Validation Rules**:
- `providerUserId`: 非空字串
- 同一 `provider + providerUserId` 組合全域唯一

**Relationship**:
- Account : OAuthLink = 1 : N（一個帳號可綁定多個 OAuth Provider）
- 同一 Provider 只能綁定一個 Account

---

### 1.4 Session (Value Object)

Session 資訊，用於認證狀態管理。

```typescript
// server/identity/domain/types/session.ts

interface Session {
  readonly id: SessionId          // crypto.randomBytes(32)
  readonly playerId: PlayerId
  readonly createdAt: Date
  readonly expiresAt: Date        // 過期時間
  readonly lastAccessedAt: Date   // 最後存取時間（滑動過期用）
}

type SessionId = string & { readonly _brand: unique symbol }
```

**Configuration**:
- Session 有效期: 7 天
- 滑動過期: 每次請求更新 `lastAccessedAt`，若距離 `createdAt` 超過 7 天則過期

---

### 1.5 GuestToken (Value Object)

訪客身份憑證，用於 Cookie 追蹤。

```typescript
// server/identity/domain/types/guest-token.ts

interface GuestToken {
  readonly playerId: PlayerId     // 關聯的訪客 Player
  readonly token: string          // Cookie 中的識別碼
  readonly expiresAt: Date        // 30 天過期
}
```

---

## 2. Database Schema (Drizzle ORM)

### 2.1 players 資料表

```typescript
// server/database/schema/players.ts

import { pgTable, uuid, varchar, boolean, timestamp } from 'drizzle-orm/pg-core'

export const players = pgTable('players', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  isGuest: boolean('is_guest').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

### 2.2 accounts 資料表

```typescript
// server/database/schema/accounts.ts

import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { players } from './players'

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  playerId: uuid('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  username: varchar('username', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('accounts_username_unique').on(table.username),
  uniqueIndex('accounts_email_unique').on(table.email),
  uniqueIndex('accounts_player_id_unique').on(table.playerId),
])
```

### 2.3 oauth_links 資料表

```typescript
// server/database/schema/oauthLinks.ts

import { pgTable, uuid, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { accounts } from './accounts'

export const oauthLinks = pgTable('oauth_links', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(), // 'google' | 'line'
  providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
  providerEmail: varchar('provider_email', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('oauth_links_provider_user_unique').on(table.provider, table.providerUserId),
])
```

### 2.4 sessions 資料表（可選，若需 DB-backed session）

```typescript
// server/database/schema/sessions.ts

import { pgTable, varchar, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { players } from './players'

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey().notNull(), // base64url encoded
  playerId: uuid('player_id').notNull().references(() => players.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('sessions_player_id_idx').on(table.playerId),
  index('sessions_expires_at_idx').on(table.expiresAt),
])
```

---

## 3. Entity Relationship Diagram

```
┌──────────────────────┐
│       Player         │
│ (Aggregate Root)     │
├──────────────────────┤
│ id (PK, UUID)        │
│ display_name         │
│ is_guest             │
│ created_at           │
│ updated_at           │
└──────────┬───────────┘
           │
           │ 1:1 (optional)
           │
           ▼
┌──────────────────────┐       ┌──────────────────────┐
│       Account        │       │      OAuthLink       │
├──────────────────────┤       ├──────────────────────┤
│ id (PK, UUID)        │◀──1:N─│ id (PK, UUID)        │
│ player_id (FK, UQ)   │       │ account_id (FK)      │
│ username (UQ)        │       │ provider             │
│ email (UQ, nullable) │       │ provider_user_id     │
│ password_hash        │       │ provider_email       │
│ created_at           │       │ created_at           │
│ updated_at           │       └──────────────────────┘
└──────────────────────┘

┌──────────────────────┐
│       Session        │
├──────────────────────┤
│ id (PK, varchar)     │
│ player_id (FK)       │◀── Player.id
│ created_at           │
│ expires_at           │
│ last_accessed_at     │
└──────────────────────┘
```

---

## 4. Relationships Summary

| 關係 | 來源 | 目標 | 類型 | 說明 |
|------|------|------|------|------|
| Player → Account | Player.id | Account.player_id | 1:0..1 | 訪客無 Account，註冊後有一個 |
| Account → OAuthLink | Account.id | OAuthLink.account_id | 1:N | 一個帳號可綁定多個 OAuth |
| Player → Session | Player.id | Session.player_id | 1:N | 一個玩家可有多個有效 Session |

---

## 5. Indexes

| 資料表 | 索引名稱 | 欄位 | 類型 | 目的 |
|--------|---------|------|------|------|
| accounts | accounts_username_unique | username | UNIQUE | 帳號唯一性檢查 |
| accounts | accounts_email_unique | email | UNIQUE | Email 唯一性檢查 |
| accounts | accounts_player_id_unique | player_id | UNIQUE | 確保 1:1 關係 |
| oauth_links | oauth_links_provider_user_unique | provider, provider_user_id | UNIQUE | 防止重複綁定 |
| sessions | sessions_player_id_idx | player_id | INDEX | 查詢玩家 sessions |
| sessions | sessions_expires_at_idx | expires_at | INDEX | 清理過期 sessions |

---

## 6. Migration Strategy

### 6.1 初始 Migration

```sql
-- 001_create_identity_tables.sql

-- 1. 建立 players 資料表
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(50) NOT NULL,
  is_guest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 建立 accounts 資料表
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
  username VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 建立 oauth_links 資料表
CREATE TABLE oauth_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  provider_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);

-- 4. 建立 sessions 資料表（可選）
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_player_id_idx ON sessions(player_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
```

### 6.2 與現有系統整合

**注意**：現有 `games` 資料表中的 `player1_id`、`player2_id` 目前儲存的是前端生成的 UUID。

**Migration 策略**：
1. 先完成 Identity BC 功能
2. 新遊戲使用新的 Player ID
3. 舊遊戲資料不遷移（MVP 階段可接受）

---

## 7. Domain Services

### 7.1 AccountLinkingService

處理 OAuth 帳號連結邏輯。

```typescript
// server/identity/domain/services/account-linking-service.ts

interface AccountLinkingService {
  /**
   * 嘗試自動連結：當 OAuth Email 與現有帳號 Email 相同時
   */
  tryAutoLink(oauthEmail: string, accountId: AccountId): Promise<boolean>

  /**
   * 手動連結：驗證密碼後連結 OAuth 至現有帳號
   */
  manualLink(
    accountId: AccountId,
    password: string,
    oauthLink: OAuthLink
  ): Promise<Result<void, 'INVALID_PASSWORD'>>
}
```

---

## 8. Frontend Domain Model

### 8.1 CurrentPlayer (Value Object)

```typescript
// app/identity/domain/current-player.ts

interface CurrentPlayer {
  readonly id: string
  readonly displayName: string
  readonly isGuest: boolean
  readonly isAuthenticated: boolean
}

// 未登入狀態
const ANONYMOUS_PLAYER: CurrentPlayer = {
  id: '',
  displayName: '',
  isGuest: true,
  isAuthenticated: false,
}
```

---

## 9. Cleanup Strategy

### 9.1 訪客資料清理（FR-010a）

**排程任務**：每日執行，刪除超過 90 天未活躍的訪客資料。

```sql
-- 清理 90 天未活躍的訪客
DELETE FROM players
WHERE is_guest = true
AND updated_at < NOW() - INTERVAL '90 days';
```

**注意**：CASCADE 會自動刪除關聯的 sessions，但 games 資料需另行處理（參考 Core Game BC 清理策略）。
