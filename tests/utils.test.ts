import { describe, it, expect } from "vitest"
import {
  csvToStringArray,
  csvToNumberArray,
  stringToBool,
  stringToNumber,
  stringArrayToCsv,
} from "../src/utils"

describe("Utils - String Conversion", () => {
  describe("csvToStringArray", () => {
    it("should convert comma-separated values to array", () => {
      const result = csvToStringArray("key,summary,status")
      expect(result).toEqual(["key", "summary", "status"])
    })

    it("should trim whitespace from values", () => {
      const result = csvToStringArray("key, summary , status")
      expect(result).toEqual(["key", "summary", "status"])
    })

    it("should return empty array when input is undefined", () => {
      const result = csvToStringArray(undefined)
      expect(result).toEqual([])
    })

    it("should return empty array when input is empty string", () => {
      const result = csvToStringArray("")
      expect(result).toEqual([])
    })

    it("should handle single value", () => {
      const result = csvToStringArray("key")
      expect(result).toEqual(["key"])
    })

    it("should handle values with internal spaces", () => {
      const result = csvToStringArray("In Progress,To Do")
      expect(result).toEqual(["In Progress", "To Do"])
    })
  })

  describe("csvToNumberArray", () => {
    it("should convert comma-separated numeric values to number array", () => {
      const result = csvToNumberArray("1,2,3,4,5")
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    it("should trim whitespace from numeric values", () => {
      const result = csvToNumberArray("1, 2 , 3")
      expect(result).toEqual([1, 2, 3])
    })

    it("should return empty array when input is undefined", () => {
      const result = csvToNumberArray(undefined)
      expect(result).toEqual([])
    })

    it("should return empty array when input is empty string", () => {
      const result = csvToNumberArray("")
      expect(result).toEqual([])
    })

    it("should handle single numeric value", () => {
      const result = csvToNumberArray("42")
      expect(result).toEqual([42])
    })

    it("should parse numeric strings correctly", () => {
      const result = csvToNumberArray("100,200,300")
      expect(result).toEqual([100, 200, 300])
    })
  })

  describe("stringToBool", () => {
    it('should return true when value is "true"', () => {
      const result = stringToBool("true")
      expect(result).toBe(true)
    })

    it('should return true when value is "TRUE" (case-insensitive)', () => {
      const result = stringToBool("TRUE")
      expect(result).toBe(true)
    })

    it('should return true when value is "True" (case-insensitive)', () => {
      const result = stringToBool("True")
      expect(result).toBe(true)
    })

    it("should return false when value is anything else", () => {
      expect(stringToBool("false")).toBe(false)
      expect(stringToBool("1")).toBe(false)
      expect(stringToBool("yes")).toBe(false)
      expect(stringToBool("anything")).toBe(false)
    })

    it("should return default value when input is undefined", () => {
      expect(stringToBool(undefined, true)).toBe(true)
      expect(stringToBool(undefined, false)).toBe(false)
    })

    it("should return false as default when no default is provided", () => {
      const result = stringToBool(undefined)
      expect(result).toBe(false)
    })

    it("should handle empty string", () => {
      const result = stringToBool("")
      expect(result).toBe(false)
    })
  })

  describe("stringToNumber", () => {
    it("should convert string to number", () => {
      expect(stringToNumber("42")).toBe(42)
      expect(stringToNumber("100")).toBe(100)
      expect(stringToNumber("0")).toBe(0)
    })

    it("should return default value when input is undefined", () => {
      expect(stringToNumber(undefined, 50)).toBe(50)
      expect(stringToNumber(undefined, 100)).toBe(100)
    })

    it("should return 0 as default when no default is provided", () => {
      const result = stringToNumber(undefined)
      expect(result).toBe(0)
    })

    it("should handle negative numbers", () => {
      expect(stringToNumber("-42")).toBe(-42)
    })

    it("should parse numeric strings with leading zeros", () => {
      expect(stringToNumber("007")).toBe(7)
    })

    it("should use base 10 for parsing", () => {
      // parseInt with base 10 should not interpret as octal
      expect(stringToNumber("08")).toBe(8)
    })

    it("should handle empty string", () => {
      const result = stringToNumber("")
      expect(Number.isNaN(result)).toBe(true)
    })
  })
})

describe("stringArrayToCsv", () => {
  it("joins multiple strings with comma+space", () => {
    const arr = ["one", "two", "three"]
    expect(stringArrayToCsv(arr)).toBe("one, two, three")
  })

  it("returns empty string for empty array", () => {
    expect(stringArrayToCsv([])).toBe("")
  })

  it("preserves whitespace in elements (no trimming)", () => {
    const arr = [" a", "b ", " c "]
    expect(stringArrayToCsv(arr)).toBe(" a, b ,  c ")
  })

  it("works with single element", () => {
    expect(stringArrayToCsv(["solo"])).toBe("solo")
  })
})
