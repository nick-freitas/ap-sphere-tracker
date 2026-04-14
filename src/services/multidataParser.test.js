import { describe, it, expect } from 'vitest'
import { parsePickle, readZipArchipelagoEntry, parseMultidata } from './multidataParser'
import { readFileSync } from 'node:fs'

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

describe('parsePickle — composition', () => {
  it('parses a populated dict via MARK + SETITEMS', () => {
    // EMPTY_DICT, MARK, "a", 1, "b", 2, SETITEMS, STOP
    const bytes = new Uint8Array([
      0x7d,                            // EMPTY_DICT
      0x28,                            // MARK
      0x8c, 0x01, 0x61,                // SHORT_BINUNICODE "a"
      0x4b, 0x01,                      // BININT1 1
      0x8c, 0x01, 0x62,                // SHORT_BINUNICODE "b"
      0x4b, 0x02,                      // BININT1 2
      0x75,                            // SETITEMS
      0x2e,                            // STOP
    ])
    expect(parsePickle(bytes)).toEqual({ a: 1, b: 2 })
  })

  it('parses a populated list via MARK + APPENDS', () => {
    // EMPTY_LIST, MARK, 10, 20, 30, APPENDS, STOP
    const bytes = new Uint8Array([
      0x5d,                            // EMPTY_LIST
      0x28,                            // MARK
      0x4b, 0x0a,                      // BININT1 10
      0x4b, 0x14,                      // BININT1 20
      0x4b, 0x1e,                      // BININT1 30
      0x65,                            // APPENDS
      0x2e,                            // STOP
    ])
    expect(parsePickle(bytes)).toEqual([10, 20, 30])
  })

  it('parses a tuple via MARK + TUPLE', () => {
    // MARK, 1, 2, 3, TUPLE, STOP
    const bytes = new Uint8Array([
      0x28,                            // MARK
      0x4b, 0x01,                      // BININT1 1
      0x4b, 0x02,                      // BININT1 2
      0x4b, 0x03,                      // BININT1 3
      0x74,                            // TUPLE
      0x2e,                            // STOP
    ])
    expect(parsePickle(bytes)).toEqual([1, 2, 3])
  })

  it('parses a TUPLE1 (single-element tuple)', () => {
    // BININT1 42, TUPLE1, STOP
    const bytes = new Uint8Array([0x4b, 0x2a, 0x85, 0x2e])
    expect(parsePickle(bytes)).toEqual([42])
  })

  it('parses a TUPLE2 (two-element tuple)', () => {
    // BININT1 1, BININT1 2, TUPLE2, STOP
    const bytes = new Uint8Array([0x4b, 0x01, 0x4b, 0x02, 0x86, 0x2e])
    expect(parsePickle(bytes)).toEqual([1, 2])
  })

  it('parses a TUPLE3 (three-element tuple)', () => {
    // BININT1 1, BININT1 2, BININT1 3, TUPLE3, STOP
    const bytes = new Uint8Array([0x4b, 0x01, 0x4b, 0x02, 0x4b, 0x03, 0x87, 0x2e])
    expect(parsePickle(bytes)).toEqual([1, 2, 3])
  })

  it('parses a nested dict with a tuple value', () => {
    // {x: (1, 2)}
    const bytes = new Uint8Array([
      0x7d,                            // EMPTY_DICT
      0x28,                            // MARK
      0x8c, 0x01, 0x78,                // SHORT_BINUNICODE "x"
      0x4b, 0x01,                      // BININT1 1
      0x4b, 0x02,                      // BININT1 2
      0x86,                            // TUPLE2
      0x75,                            // SETITEMS
      0x2e,                            // STOP
    ])
    expect(parsePickle(bytes)).toEqual({ x: [1, 2] })
  })
})

describe('parsePickle — memoization', () => {
  it('memoizes a value and recalls it via BINGET', () => {
    // ["abc", "abc"] where the second "abc" is via BINGET
    const bytes = new Uint8Array([
      0x5d,                                  // EMPTY_LIST
      0x28,                                  // MARK
      0x8c, 0x03, 0x61, 0x62, 0x63,          // SHORT_BINUNICODE "abc"
      0x94,                                  // MEMOIZE → memo[0] = "abc"
      0x68, 0x00,                            // BINGET 0
      0x65,                                  // APPENDS
      0x2e,                                  // STOP
    ])
    expect(parsePickle(bytes)).toEqual(['abc', 'abc'])
  })

  it('memoizes twice and recalls each via BINGET', () => {
    // ["x", "y", "x", "y"] where the 3rd and 4th are BINGETs
    const bytes = new Uint8Array([
      0x5d,                                  // EMPTY_LIST
      0x28,                                  // MARK
      0x8c, 0x01, 0x78,                      // SHORT_BINUNICODE "x"
      0x94,                                  // MEMOIZE → memo[0] = "x"
      0x8c, 0x01, 0x79,                      // SHORT_BINUNICODE "y"
      0x94,                                  // MEMOIZE → memo[1] = "y"
      0x68, 0x00,                            // BINGET 0 → "x"
      0x68, 0x01,                            // BINGET 1 → "y"
      0x65,                                  // APPENDS
      0x2e,                                  // STOP
    ])
    expect(parsePickle(bytes)).toEqual(['x', 'y', 'x', 'y'])
  })

  it('uses LONG_BINGET for memo indices > 255', () => {
    // Build a list with one memoized entry then recall via LONG_BINGET with index 0
    // (semantically identical to BINGET 0 but with 4-byte index encoding).
    const bytes = new Uint8Array([
      0x5d,                                  // EMPTY_LIST
      0x28,                                  // MARK
      0x8c, 0x01, 0x7a,                      // SHORT_BINUNICODE "z"
      0x94,                                  // MEMOIZE → memo[0]
      0x6a, 0x00, 0x00, 0x00, 0x00,          // LONG_BINGET 0 (4-byte LE)
      0x65,                                  // APPENDS
      0x2e,                                  // STOP
    ])
    expect(parsePickle(bytes)).toEqual(['z', 'z'])
  })

  it('memoized objects are stored by reference (mutation propagates)', () => {
    // Memoize a dict, then recall it and SETITEMS into the recall — both references
    // should see the mutation because memo stores the same object.
    const bytes = new Uint8Array([
      0x5d,                                  // EMPTY_LIST
      0x28,                                  // MARK
      0x7d,                                  // EMPTY_DICT (this one we keep)
      0x94,                                  // MEMOIZE → memo[0] = {}
      0x28,                                  // MARK
      0x8c, 0x01, 0x61,                      // SHORT_BINUNICODE "a"
      0x4b, 0x01,                            // BININT1 1
      0x75,                                  // SETITEMS (fills dict on stack)
      0x68, 0x00,                            // BINGET 0 (same dict)
      0x65,                                  // APPENDS
      0x2e,                                  // STOP
    ])
    const result = parsePickle(bytes)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ a: 1 })
    expect(result[1]).toBe(result[0]) // same object reference
  })
})

describe('parsePickle — class references', () => {
  it('creates a class-reference placeholder via STACK_GLOBAL', () => {
    // "NetUtils" "NetworkSlot" STACK_GLOBAL STOP
    const bytes = new Uint8Array([
      0x8c, 0x08, 0x4e, 0x65, 0x74, 0x55, 0x74, 0x69, 0x6c, 0x73,   // "NetUtils"
      0x8c, 0x0b, 0x4e, 0x65, 0x74, 0x77, 0x6f, 0x72, 0x6b, 0x53, 0x6c, 0x6f, 0x74, // "NetworkSlot"
      0x93,                                                          // STACK_GLOBAL
      0x2e,                                                          // STOP
    ])
    expect(parsePickle(bytes)).toEqual({
      __class: 'reference',
      module: 'NetUtils',
      name: 'NetworkSlot',
    })
  })

  it('instantiates an object via REDUCE', () => {
    // class_ref, (args_tuple), REDUCE, STOP
    // → { __class: "instance", module: "m", name: "C", args: [...] }
    const bytes = new Uint8Array([
      0x8c, 0x01, 0x6d,                                              // "m"
      0x8c, 0x01, 0x43,                                              // "C"
      0x93,                                                          // STACK_GLOBAL
      0x28, 0x4b, 0x2a, 0x74,                                        // MARK, BININT1 42, TUPLE → (42,)
      0x52,                                                          // REDUCE
      0x2e,                                                          // STOP
    ])
    expect(parsePickle(bytes)).toEqual({
      __class: 'instance',
      module: 'm',
      name: 'C',
      args: [42],
      state: null,
    })
  })

  it('applies state via BUILD', () => {
    // Like REDUCE, but then BUILD with a state dict
    const bytes = new Uint8Array([
      0x8c, 0x01, 0x6d,                                              // "m"
      0x8c, 0x01, 0x43,                                              // "C"
      0x93,                                                          // STACK_GLOBAL
      0x29,                                                          // EMPTY_TUPLE
      0x52,                                                          // REDUCE
      0x7d, 0x28, 0x8c, 0x01, 0x78, 0x4b, 0x07, 0x75,                // {"x": 7}
      0x62,                                                          // BUILD
      0x2e,                                                          // STOP
    ])
    expect(parsePickle(bytes)).toEqual({
      __class: 'instance',
      module: 'm',
      name: 'C',
      args: [],
      state: { x: 7 },
    })
  })
})

describe('readZipArchipelagoEntry', () => {
  // Build a minimal synthetic ZIP with a single STORED entry.
  // ZIP format:
  //   Local File Header (LFH) → file data → Central File Header (CFH) → End of Central Directory (EOCD)
  function buildStoredZip(filename, data) {
    const filenameBytes = new TextEncoder().encode(filename)
    const lfhSize = 30 + filenameBytes.length
    const dataSize = data.length
    const cfhSize = 46 + filenameBytes.length
    const totalSize = lfhSize + dataSize + cfhSize + 22

    const buf = new Uint8Array(totalSize)
    const view = new DataView(buf.buffer)
    let offset = 0

    // Local file header
    view.setUint32(offset, 0x04034b50, true); offset += 4  // signature
    view.setUint16(offset, 20, true); offset += 2           // version needed
    view.setUint16(offset, 0, true); offset += 2            // flags
    view.setUint16(offset, 0, true); offset += 2            // method = STORED
    view.setUint16(offset, 0, true); offset += 2            // mod time
    view.setUint16(offset, 0, true); offset += 2            // mod date
    view.setUint32(offset, 0, true); offset += 4            // crc32 (fake, not validated)
    view.setUint32(offset, dataSize, true); offset += 4     // compressed size
    view.setUint32(offset, dataSize, true); offset += 4     // uncompressed size
    view.setUint16(offset, filenameBytes.length, true); offset += 2  // filename length
    view.setUint16(offset, 0, true); offset += 2            // extra length
    buf.set(filenameBytes, offset); offset += filenameBytes.length
    buf.set(data, offset); offset += dataSize

    // Central file header
    const cfhOffset = offset
    view.setUint32(offset, 0x02014b50, true); offset += 4   // signature
    view.setUint16(offset, 20, true); offset += 2           // version made
    view.setUint16(offset, 20, true); offset += 2           // version needed
    view.setUint16(offset, 0, true); offset += 2            // flags
    view.setUint16(offset, 0, true); offset += 2            // method
    view.setUint16(offset, 0, true); offset += 2            // mod time
    view.setUint16(offset, 0, true); offset += 2            // mod date
    view.setUint32(offset, 0, true); offset += 4            // crc32
    view.setUint32(offset, dataSize, true); offset += 4     // compressed size
    view.setUint32(offset, dataSize, true); offset += 4     // uncompressed size
    view.setUint16(offset, filenameBytes.length, true); offset += 2  // filename length
    view.setUint16(offset, 0, true); offset += 2            // extra length
    view.setUint16(offset, 0, true); offset += 2            // comment length
    view.setUint16(offset, 0, true); offset += 2            // disk number
    view.setUint16(offset, 0, true); offset += 2            // internal attrs
    view.setUint32(offset, 0, true); offset += 4            // external attrs
    view.setUint32(offset, 0, true); offset += 4            // local header offset
    buf.set(filenameBytes, offset); offset += filenameBytes.length

    // End of central directory
    view.setUint32(offset, 0x06054b50, true); offset += 4   // signature
    view.setUint16(offset, 0, true); offset += 2            // disk
    view.setUint16(offset, 0, true); offset += 2            // central dir disk
    view.setUint16(offset, 1, true); offset += 2            // entries on disk
    view.setUint16(offset, 1, true); offset += 2            // total entries
    view.setUint32(offset, cfhSize, true); offset += 4      // central dir size
    view.setUint32(offset, cfhOffset, true); offset += 4    // central dir offset
    view.setUint16(offset, 0, true); offset += 2            // comment length

    return buf
  }

  // Build a synthetic ZIP with a single DEFLATE entry using CompressionStream.
  async function buildDeflateZip(filename, data) {
    const compressed = await new Response(
      new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'))
    ).arrayBuffer()
    const compressedBytes = new Uint8Array(compressed)
    const filenameBytes = new TextEncoder().encode(filename)
    const lfhSize = 30 + filenameBytes.length
    const cfhSize = 46 + filenameBytes.length
    const totalSize = lfhSize + compressedBytes.length + cfhSize + 22
    const buf = new Uint8Array(totalSize)
    const view = new DataView(buf.buffer)
    let offset = 0

    view.setUint32(offset, 0x04034b50, true); offset += 4
    view.setUint16(offset, 20, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    view.setUint16(offset, 8, true); offset += 2            // method = DEFLATE
    view.setUint16(offset, 0, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    view.setUint32(offset, 0, true); offset += 4
    view.setUint32(offset, compressedBytes.length, true); offset += 4
    view.setUint32(offset, data.length, true); offset += 4
    view.setUint16(offset, filenameBytes.length, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    buf.set(filenameBytes, offset); offset += filenameBytes.length
    buf.set(compressedBytes, offset); offset += compressedBytes.length

    const cfhOffset = offset
    view.setUint32(offset, 0x02014b50, true); offset += 4
    view.setUint16(offset, 20, true); offset += 2
    view.setUint16(offset, 20, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    view.setUint16(offset, 8, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    view.setUint32(offset, 0, true); offset += 4
    view.setUint32(offset, compressedBytes.length, true); offset += 4
    view.setUint32(offset, data.length, true); offset += 4
    view.setUint16(offset, filenameBytes.length, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    view.setUint32(offset, 0, true); offset += 4
    view.setUint32(offset, 0, true); offset += 4
    buf.set(filenameBytes, offset); offset += filenameBytes.length

    view.setUint32(offset, 0x06054b50, true); offset += 4
    view.setUint16(offset, 0, true); offset += 2
    view.setUint16(offset, 0, true); offset += 2
    view.setUint16(offset, 1, true); offset += 2
    view.setUint16(offset, 1, true); offset += 2
    view.setUint32(offset, cfhSize, true); offset += 4
    view.setUint32(offset, cfhOffset, true); offset += 4
    view.setUint16(offset, 0, true); offset += 2

    return buf
  }

  it('extracts a stored .archipelago entry', async () => {
    const payload = new Uint8Array([0x03, 0x78, 0x9c, 0x01, 0x02, 0x03])
    const zip = buildStoredZip('AP_test.archipelago', payload)
    const extracted = await readZipArchipelagoEntry(zip)
    expect(extracted).toEqual(payload)
  })

  it('extracts a deflate-compressed .archipelago entry', async () => {
    const payload = new Uint8Array([0x03, 0x78, 0x9c, 0x01, 0x02, 0x03, 0x04, 0x05])
    const zip = await buildDeflateZip('AP_test.archipelago', payload)
    const extracted = await readZipArchipelagoEntry(zip)
    expect(extracted).toEqual(payload)
  })

  it('throws when no .archipelago entry exists', async () => {
    const zip = buildStoredZip('AP_test.txt', new Uint8Array([1, 2, 3]))
    await expect(readZipArchipelagoEntry(zip)).rejects.toThrow(/no .*archipelago/i)
  })
})

describe('parseMultidata — end-to-end fixture', () => {
  const fixtureBytes = new Uint8Array(readFileSync('public/default-seed.archipelago'))

  it('parses the test seed and extracts expected structural properties', async () => {
    const md = await parseMultidata(fixtureBytes)

    // Top-level shape
    expect(md.datapackage).toBeInstanceOf(Map)
    expect(md.locations).toBeInstanceOf(Map)
    expect(md.slot_info).toBeInstanceOf(Map)

    // Seven slots, matching the test seed's players
    expect(md.locations.size).toBe(7)
    expect(md.slot_info.size).toBe(7)

    // Per-slot check counts match the spoiler header
    expect(md.locations.get(5).size).toBe(750)   // Nick
    expect(md.locations.get(4).size).toBe(890)   // Naizak
    expect(md.locations.get(2).size).toBe(643)   // Brian
    expect(md.locations.get(6).size).toBe(180)   // Ryot
    expect(md.locations.get(7).size).toBe(1190)  // TNNPE

    // Datapackage has both OoT variants
    expect(md.datapackage.has('Ocarina of Time')).toBe(true)
    expect(md.datapackage.has('Ship of Harkinian')).toBe(true)

    // Market ToT Master Sword (Ship of Harkinian location id 60) is NOT in Nick's checks.
    // This is the regression test for the un-shuffled-slot issue.
    expect(md.locations.get(5).has(60)).toBe(false)

    // Link's Pocket (Ship of Harkinian location id 1) IS in Nick's checks.
    expect(md.locations.get(5).has(1)).toBe(true)
  })

  it('sniffs a raw .archipelago file (version byte prefix)', async () => {
    const md = await parseMultidata(fixtureBytes)
    // First byte of the fixture is the version marker (0x03)
    expect(fixtureBytes[0]).toBe(0x03)
    expect(md.locations.size).toBe(7)
  })
})
