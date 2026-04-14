import { describe, it, expect } from 'vitest'
import { parsePickle } from './multidataParser'

// Helper: build a Uint8Array from byte literals.
function b(...bytes) {
  return new Uint8Array(bytes)
}

// Helper: build a Uint8Array from a byte sequence + append STOP (0x2e).
function pkg(...bytes) {
  return new Uint8Array([...bytes, 0x2e])
}

describe('parsePickle — primitives', () => {
  it('parses empty dict', () => {
    expect(parsePickle(pkg(0x7d))).toEqual({})
  })

  it('parses empty list', () => {
    expect(parsePickle(pkg(0x5d))).toEqual([])
  })

  it('parses empty tuple', () => {
    expect(parsePickle(pkg(0x29))).toEqual([])
  })

  it('parses None', () => {
    expect(parsePickle(pkg(0x4e))).toBeNull()
  })

  it('parses true', () => {
    expect(parsePickle(pkg(0x88))).toBe(true)
  })

  it('parses false', () => {
    expect(parsePickle(pkg(0x89))).toBe(false)
  })

  it('parses BININT1 (small unsigned byte)', () => {
    // BININT1 0x2a = 42
    expect(parsePickle(pkg(0x4b, 0x2a))).toBe(42)
  })

  it('parses BININT2 (unsigned 16-bit LE)', () => {
    // BININT2 1000 = 0xe8 0x03 LE
    expect(parsePickle(pkg(0x4d, 0xe8, 0x03))).toBe(1000)
  })

  it('parses BININT (signed 32-bit LE)', () => {
    // BININT 100000 = 0xa0 0x86 0x01 0x00 LE
    expect(parsePickle(pkg(0x4a, 0xa0, 0x86, 0x01, 0x00))).toBe(100000)
  })

  it('parses BININT (negative 32-bit)', () => {
    // -1 as int32 LE = 0xff 0xff 0xff 0xff
    expect(parsePickle(pkg(0x4a, 0xff, 0xff, 0xff, 0xff))).toBe(-1)
  })

  it('parses LONG1 (small positive)', () => {
    // LONG1 len=2, bytes=0x00 0x01 (256 LE two-byte signed)
    expect(parsePickle(pkg(0x8a, 0x02, 0x00, 0x01))).toBe(256)
  })

  it('parses LONG1 zero-length as 0', () => {
    // LONG1 len=0 → the integer 0
    expect(parsePickle(pkg(0x8a, 0x00))).toBe(0)
  })

  it('parses SHORT_BINUNICODE', () => {
    // SHORT_BINUNICODE len=5 "hello"
    expect(parsePickle(pkg(0x8c, 0x05, 0x68, 0x65, 0x6c, 0x6c, 0x6f))).toBe('hello')
  })

  it('parses BINUNICODE', () => {
    const str = 'archipelago'
    const encoded = new TextEncoder().encode(str)
    // BINUNICODE len=11 LE, then UTF-8 bytes
    const bytes = new Uint8Array([0x8d, 0x0b, 0x00, 0x00, 0x00, ...encoded, 0x2e])
    expect(parsePickle(bytes)).toBe(str)
  })

  it('handles PROTO and FRAME as advisory (skip)', () => {
    // PROTO 4, FRAME (8 bytes length payload, all zeros), EMPTY_DICT, STOP
    const bytes = b(0x80, 0x04, 0x95, 0x08, 0, 0, 0, 0, 0, 0, 0, 0x7d, 0x2e)
    expect(parsePickle(bytes)).toEqual({})
  })

  it('throws on unknown opcode', () => {
    expect(() => parsePickle(b(0xff, 0x2e))).toThrow(/unknown.*opcode/i)
  })
})
