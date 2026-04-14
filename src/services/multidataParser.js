// Pickle opcodes (Python pickle protocol 4 subset used by Archipelago multidata)
const OP = {
  PROTO: 0x80,
  FRAME: 0x95,
  STOP: 0x2e,
  EMPTY_DICT: 0x7d,
  EMPTY_LIST: 0x5d,
  EMPTY_TUPLE: 0x29,
  NEWTRUE: 0x88,
  NEWFALSE: 0x89,
  NONE: 0x4e,
  BININT: 0x4a,
  BININT1: 0x4b,
  BININT2: 0x4d,
  LONG1: 0x8a,
  LONG4: 0x8b,
  SHORT_BINUNICODE: 0x8c,
  BINUNICODE: 0x8d,
}

class ByteReader {
  constructor(bytes) {
    this.bytes = bytes
    this.pos = 0
  }
  readByte() {
    const b = this.bytes[this.pos]
    this.pos += 1
    return b
  }
  readBytes(n) {
    const out = this.bytes.subarray(this.pos, this.pos + n)
    this.pos += n
    return out
  }
  readUint16LE() {
    const v = this.bytes[this.pos] | (this.bytes[this.pos + 1] << 8)
    this.pos += 2
    return v
  }
  readInt32LE() {
    const b0 = this.bytes[this.pos]
    const b1 = this.bytes[this.pos + 1]
    const b2 = this.bytes[this.pos + 2]
    const b3 = this.bytes[this.pos + 3]
    this.pos += 4
    // Force signed interpretation via bitwise OR with 0.
    return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) | 0
  }
  readUint32LE() {
    const b0 = this.bytes[this.pos]
    const b1 = this.bytes[this.pos + 1]
    const b2 = this.bytes[this.pos + 2]
    const b3 = this.bytes[this.pos + 3]
    this.pos += 4
    return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0
  }
}

// Decode a variable-length little-endian signed integer from its raw bytes.
// This is how Python pickle serializes LONG1/LONG4 integer values.
function parseLongBytes(bytes) {
  if (bytes.length === 0) return 0
  let result = 0
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = result * 256 + bytes[i]
  }
  // High bit of the most significant byte means negative (two's complement).
  if (bytes[bytes.length - 1] & 0x80) {
    result -= Math.pow(256, bytes.length)
  }
  return result
}

export function parsePickle(bytes) {
  const reader = new ByteReader(bytes)
  const stack = []
  const textDecoder = new TextDecoder('utf-8')

  while (true) {
    const op = reader.readByte()
    switch (op) {
      case OP.PROTO:
        reader.readByte() // skip protocol version
        break
      case OP.FRAME:
        reader.readBytes(8) // skip frame length payload
        break
      case OP.STOP:
        return stack.pop()
      case OP.EMPTY_DICT:
        stack.push({})
        break
      case OP.EMPTY_LIST:
        stack.push([])
        break
      case OP.EMPTY_TUPLE:
        stack.push([])
        break
      case OP.NEWTRUE:
        stack.push(true)
        break
      case OP.NEWFALSE:
        stack.push(false)
        break
      case OP.NONE:
        stack.push(null)
        break
      case OP.BININT:
        stack.push(reader.readInt32LE())
        break
      case OP.BININT1:
        stack.push(reader.readByte())
        break
      case OP.BININT2:
        stack.push(reader.readUint16LE())
        break
      case OP.LONG1: {
        const len = reader.readByte()
        stack.push(parseLongBytes(reader.readBytes(len)))
        break
      }
      case OP.LONG4: {
        const len = reader.readUint32LE()
        stack.push(parseLongBytes(reader.readBytes(len)))
        break
      }
      case OP.SHORT_BINUNICODE: {
        const len = reader.readByte()
        stack.push(textDecoder.decode(reader.readBytes(len)))
        break
      }
      case OP.BINUNICODE: {
        const len = reader.readUint32LE()
        stack.push(textDecoder.decode(reader.readBytes(len)))
        break
      }
      default:
        throw new Error(`Unknown pickle opcode: 0x${op.toString(16).padStart(2, '0')}`)
    }
  }
}
