/**
 * User Interface BC - Domain Layer 型別定義
 *
 * 此檔案定義所有 Domain Layer 的核心型別，包括：
 * - Card（卡片）
 * - CardType（卡片類型）
 * - YakuType（役種類型）
 * - YakuProgress（役種進度）
 *
 * 所有型別均為不可變（immutable），符合 Clean Architecture 原則。
 *
 * @module user-interface/domain/types
 * @version 1.0.0
 * @since 2025-11-13
 */

// ============================================================================
// Card Types (卡片相關型別)
// ============================================================================

/**
 * 卡片類型枚舉
 *
 * 花札卡片的四種類型，對應不同的分數和役種分類。
 */
export type CardType = "BRIGHT" | "ANIMAL" | "RIBBON" | "PLAIN";

/**
 * 卡片 Value Object
 *
 * 代表花札遊戲中的一張卡片，使用 MMTI 格式作為唯一識別碼。
 *
 * @example
 * ```typescript
 * const matsuHikari: Card = {
 *   card_id: "0111",
 *   month: 1,
 *   type: "BRIGHT",
 *   display_name: "松鶴"
 * };
 * ```
 */
export interface Card {
  /**
   * 卡片唯一識別碼（MMTI 格式）
   *
   * 格式: MMTI
   * - MM: 月份 (01-12)
   * - T: 類型 (1=BRIGHT, 2=ANIMAL, 3=RIBBON, 4=PLAIN)
   * - I: 索引 (1-4)
   *
   * @example "0111" // 1月光牌第1張（松上鶴）
   * @example "0231" // 2月短冊第1張（梅赤短）
   */
  readonly card_id: string;

  /**
   * 月份 (1-12)
   *
   * 對應花札的12個月份：
   * 1=松, 2=梅, 3=櫻, 4=藤, 5=菖蒲, 6=牡丹,
   * 7=萩, 8=芒, 9=菊, 10=紅葉, 11=柳, 12=桐
   */
  readonly month: number;

  /**
   * 卡片類型
   *
   * - BRIGHT: 光牌 (20點, 5張)
   * - ANIMAL: 種牌 (10點, 9張)
   * - RIBBON: 短冊 (5點, 10張)
   * - PLAIN: かす (1點, 24張)
   */
  readonly type: CardType;

  /**
   * 顯示名稱
   *
   * 用於 UI 顯示的卡片名稱（中文或日文）
   *
   * @example "松鶴"
   * @example "梅赤短"
   */
  readonly display_name: string;
}

// ============================================================================
// Yaku Types (役種相關型別)
// ============================================================================

/**
 * 役種類型枚舉
 *
 * 標準「こいこい」規則的12種役種識別碼。
 *
 * 分類：
 * - 光牌系: GOKO, SHIKO, AMESHIKO, SANKO
 * - 短冊系: AKATAN, AOTAN, TAN
 * - 種牌系: INOSHIKACHO, TSUKIMI, HANAMI, TANE
 * - かす系: KASU
 */
export type YakuType =
  // === 光牌系 (4種) ===
  | "GOKO"        // 五光 (15點): 全部5張光牌
  | "SHIKO"       // 四光 (10點): 4張光牌（不含雨）
  | "AMESHIKO"    // 雨四光 (8點): 4張光牌（包含雨）
  | "SANKO"       // 三光 (6點): 3張光牌（不含雨）

  // === 短冊系 (3種) ===
  | "AKATAN"      // 赤短 (5點): 松、梅、櫻短冊
  | "AOTAN"       // 青短 (5點): 牡丹、菊、紅葉短冊
  | "TAN"         // 短冊 (1點): 5張以上短冊，每多1張+1分

  // === 種牌系 (4種) ===
  | "INOSHIKACHO" // 豬鹿蝶 (5點): 萩豬、紅葉鹿、牡丹蝶
  | "TSUKIMI"     // 月見酒 (5點): 芒月+菊盃
  | "HANAMI"      // 花見酒 (5點): 櫻幕+菊盃
  | "TANE"        // 種 (1點): 5張以上種牌，每多1張+1分

  // === かす系 (1種) ===
  | "KASU";       // かす (1點): 10張以上かす，每多1張+1分

/**
 * 役種進度 Value Object
 *
 * 追蹤用戶距離達成特定役種的進度資訊，用於 UI 提示。
 *
 * @example
 * ```typescript
 * const progress: YakuProgress = {
 *   required: [MATSU_AKATAN, UME_AKATAN, SAKURA_AKATAN],
 *   obtained: [MATSU_AKATAN, UME_AKATAN],
 *   missing: [SAKURA_AKATAN],
 *   progress: 66.67
 * };
 * ```
 */
export interface YakuProgress {
  /**
   * 達成該役種所需的卡片列表
   *
   * 對於固定役種（如赤短），此陣列包含明確的卡片。
   * 對於動態役種（如短冊），此陣列包含達成基礎要求的任意卡片。
   */
  readonly required: readonly Card[];

  /**
   * 用戶已獲得的相關卡片列表
   *
   * 此陣列為 `required` 的子集，包含用戶已收集的卡片。
   */
  readonly obtained: readonly Card[];

  /**
   * 仍缺少的卡片列表
   *
   * 計算公式: `missing = required - obtained`（集合差集）
   */
  readonly missing: readonly Card[];

  /**
   * 完成百分比 (0-100)
   *
   * 計算公式: `(obtained.length / required.length) * 100`
   *
   * @example 66.67 // 已獲得 2/3 張卡片
   * @example 100   // 已完成該役種
   */
  readonly progress: number;
}

// ============================================================================
// Validation Types (驗證相關型別)
// ============================================================================

/**
 * 客戶端驗證結果
 *
 * 用於客戶端預驗證操作合法性的返回值。
 *
 * @example
 * ```typescript
 * const result: ValidationResult = {
 *   valid: false,
 *   reason: "卡片不在手牌中"
 * };
 * ```
 */
export interface ValidationResult {
  /**
   * 驗證是否通過
   */
  readonly valid: boolean;

  /**
   * 驗證失敗原因（可選）
   *
   * 僅當 `valid === false` 時提供。
   */
  readonly reason?: string;
}

// ============================================================================
// Type Guards (型別守衛)
// ============================================================================

/**
 * 檢查值是否為合法的 CardType
 *
 * @param value - 待檢查的值
 * @returns 是否為 CardType
 *
 * @example
 * ```typescript
 * isCardType("BRIGHT") // true
 * isCardType("INVALID") // false
 * ```
 */
export function isCardType(value: unknown): value is CardType {
  return (
    typeof value === "string" &&
    ["BRIGHT", "ANIMAL", "RIBBON", "PLAIN"].includes(value)
  );
}

/**
 * 檢查值是否為合法的 YakuType
 *
 * @param value - 待檢查的值
 * @returns 是否為 YakuType
 *
 * @example
 * ```typescript
 * isYakuType("GOKO") // true
 * isYakuType("INVALID") // false
 * ```
 */
export function isYakuType(value: unknown): value is YakuType {
  const validYakuTypes: YakuType[] = [
    "GOKO", "SHIKO", "AMESHIKO", "SANKO",
    "AKATAN", "AOTAN", "TAN",
    "INOSHIKACHO", "TSUKIMI", "HANAMI", "TANE",
    "KASU"
  ];
  return typeof value === "string" && validYakuTypes.includes(value as YakuType);
}

// ============================================================================
// Constants (常數)
// ============================================================================

/**
 * 役種對應的基礎分數
 */
export const YAKU_BASE_POINTS: Readonly<Record<YakuType, number>> = {
  // 光牌系
  GOKO: 15,
  SHIKO: 10,
  AMESHIKO: 8,
  SANKO: 6,

  // 短冊系
  AKATAN: 5,
  AOTAN: 5,
  TAN: 1,

  // 種牌系
  INOSHIKACHO: 5,
  TSUKIMI: 5,
  HANAMI: 5,
  TANE: 1,

  // かす系
  KASU: 1
} as const;

// ============================================================================
// Utility Types (工具型別)
// ============================================================================

/**
 * 深度唯讀型別
 *
 * 遞迴將物件及其嵌套屬性設為 readonly。
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 卡片 ID 型別（MMTI 格式）
 *
 * 使用 string brand pattern 確保型別安全。
 */
export type CardId = string & { readonly __brand: "CardId" };

/**
 * 建立 CardId
 *
 * @param id - MMTI 格式字串
 * @returns CardId
 */
export function createCardId(id: string): CardId {
  if (!/^\d{4}$/.test(id)) {
    throw new Error(`Invalid CardId format: ${id}. Expected MMTI format (4 digits).`);
  }
  return id as CardId;
}
