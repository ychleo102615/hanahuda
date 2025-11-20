import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mmtiToSvgName, getCardIconName, DEFAULT_CARD_ICON_NAME } from '@/utils/cardMapping'

describe('cardMapping', () => {
  // Mock console.warn to avoid cluttering test output
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
  })

  describe('mmtiToSvgName', () => {
    describe('正確的 MMTI 轉換', () => {
      it('should convert Hikari cards (type 1) without index', () => {
        expect(mmtiToSvgName('0111')).toBe('Hanafuda_January_Hikari')
        expect(mmtiToSvgName('0311')).toBe('Hanafuda_March_Hikari')
        expect(mmtiToSvgName('0811')).toBe('Hanafuda_August_Hikari')
        expect(mmtiToSvgName('1111')).toBe('Hanafuda_November_Hikari')
        expect(mmtiToSvgName('1211')).toBe('Hanafuda_December_Hikari')
      })

      it('should convert Tane cards (type 2) without index', () => {
        expect(mmtiToSvgName('0221')).toBe('Hanafuda_February_Tane')
        expect(mmtiToSvgName('0421')).toBe('Hanafuda_April_Tane')
        expect(mmtiToSvgName('0621')).toBe('Hanafuda_June_Tane')
        expect(mmtiToSvgName('0721')).toBe('Hanafuda_July_Tane')
        expect(mmtiToSvgName('1021')).toBe('Hanafuda_October_Tane')
      })

      it('should convert Tanzaku cards (type 3) without index', () => {
        expect(mmtiToSvgName('0131')).toBe('Hanafuda_January_Tanzaku')
        expect(mmtiToSvgName('0231')).toBe('Hanafuda_February_Tanzaku')
        expect(mmtiToSvgName('0331')).toBe('Hanafuda_March_Tanzaku')
      })

      it('should convert Kasu cards (type 4) with index', () => {
        expect(mmtiToSvgName('0141')).toBe('Hanafuda_January_Kasu_1')
        expect(mmtiToSvgName('0142')).toBe('Hanafuda_January_Kasu_2')
        expect(mmtiToSvgName('0841')).toBe('Hanafuda_August_Kasu_1')
        expect(mmtiToSvgName('0842')).toBe('Hanafuda_August_Kasu_2')
        expect(mmtiToSvgName('1243')).toBe('Hanafuda_December_Kasu_3')
      })

      it('should convert all 12 months correctly', () => {
        expect(mmtiToSvgName('0111')).toContain('January')
        expect(mmtiToSvgName('0211')).toContain('February')
        expect(mmtiToSvgName('0311')).toContain('March')
        expect(mmtiToSvgName('0411')).toContain('April')
        expect(mmtiToSvgName('0511')).toContain('May')
        expect(mmtiToSvgName('0611')).toContain('June')
        expect(mmtiToSvgName('0711')).toContain('July')
        expect(mmtiToSvgName('0811')).toContain('August')
        expect(mmtiToSvgName('0911')).toContain('September')
        expect(mmtiToSvgName('1011')).toContain('October')
        expect(mmtiToSvgName('1111')).toContain('November')
        expect(mmtiToSvgName('1211')).toContain('December')
      })
    })

    describe('無效格式處理', () => {
      it('should return null for empty string', () => {
        expect(mmtiToSvgName('')).toBeNull()
        expect(consoleWarnSpy).toHaveBeenCalled()
      })

      it('should return null for wrong length strings', () => {
        expect(mmtiToSvgName('011')).toBeNull() // too short
        expect(mmtiToSvgName('01111')).toBeNull() // too long
        expect(mmtiToSvgName('1')).toBeNull()
      })

      it('should return null for invalid month codes', () => {
        expect(mmtiToSvgName('0011')).toBeNull() // month 00
        expect(mmtiToSvgName('1311')).toBeNull() // month 13
        expect(mmtiToSvgName('9911')).toBeNull() // month 99
      })

      it('should return null for invalid type codes', () => {
        expect(mmtiToSvgName('0101')).toBeNull() // type 0
        expect(mmtiToSvgName('0151')).toBeNull() // type 5
        expect(mmtiToSvgName('01a1')).toBeNull() // type 'a'
      })

      it('should return null for invalid index', () => {
        expect(mmtiToSvgName('0110')).toBeNull() // index 0
        expect(mmtiToSvgName('0115')).toBeNull() // index 5
        expect(mmtiToSvgName('011a')).toBeNull() // index 'a'
      })

      it('should return null for completely invalid input', () => {
        expect(mmtiToSvgName('abcd')).toBeNull()
        expect(mmtiToSvgName('invalid')).toBeNull()
      })

      it('should log warnings for invalid inputs', () => {
        mmtiToSvgName('invalid')
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[cardMapping] Invalid MMTI format')
        )

        consoleWarnSpy.mockClear()
        mmtiToSvgName('1311')
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[cardMapping] Invalid month code')
        )
      })
    })

    describe('實際卡片範例', () => {
      it('should convert 五光 (Five Brights) cards correctly', () => {
        // 五光: 松(01)、櫻(03)、芒(08)、桐(11)、柳(12)
        expect(mmtiToSvgName('0111')).toBe('Hanafuda_January_Hikari')
        expect(mmtiToSvgName('0311')).toBe('Hanafuda_March_Hikari')
        expect(mmtiToSvgName('0811')).toBe('Hanafuda_August_Hikari')
        expect(mmtiToSvgName('1111')).toBe('Hanafuda_November_Hikari')
        expect(mmtiToSvgName('1211')).toBe('Hanafuda_December_Hikari')
      })

      it('should convert 赤短 (Red Ribbons) cards correctly', () => {
        // 赤短: 松(01)、梅(02)、櫻(03)
        expect(mmtiToSvgName('0131')).toBe('Hanafuda_January_Tanzaku')
        expect(mmtiToSvgName('0231')).toBe('Hanafuda_February_Tanzaku')
        expect(mmtiToSvgName('0331')).toBe('Hanafuda_March_Tanzaku')
      })

      it('should convert 猪鹿蝶 (Boar-Deer-Butterfly) cards correctly', () => {
        // 猪鹿蝶: 萩(07)、紅葉(10)、牡丹(06)
        expect(mmtiToSvgName('0721')).toBe('Hanafuda_July_Tane')
        expect(mmtiToSvgName('1021')).toBe('Hanafuda_October_Tane')
        expect(mmtiToSvgName('0621')).toBe('Hanafuda_June_Tane')
      })
    })
  })

  describe('getCardIconName', () => {
    it('should return SVG name for valid MMTI', () => {
      expect(getCardIconName('0111')).toBe('Hanafuda_January_Hikari')
      expect(getCardIconName('0842')).toBe('Hanafuda_August_Kasu_2')
    })

    it('should return default icon name for invalid MMTI', () => {
      expect(getCardIconName('invalid')).toBe(DEFAULT_CARD_ICON_NAME)
      expect(getCardIconName('')).toBe(DEFAULT_CARD_ICON_NAME)
      expect(getCardIconName('9999')).toBe(DEFAULT_CARD_ICON_NAME)
    })

    it('should never return null or undefined', () => {
      const result = getCardIconName('invalid')
      expect(result).toBeDefined()
      expect(result).not.toBeNull()
      expect(typeof result).toBe('string')
    })
  })
})
