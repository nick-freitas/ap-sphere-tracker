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
  MARK: 0x28,
  SETITEMS: 0x75,
  APPENDS: 0x65,
  TUPLE: 0x74,
  TUPLE1: 0x85,
  TUPLE2: 0x86,
  TUPLE3: 0x87,
  MEMOIZE: 0x94,
  BINGET: 0x68,
  LONG_BINGET: 0x6a,
  BINPUT: 0x71,
  LONG_BINPUT: 0x72,
}

const MARK_SENTINEL = Symbol('pickle.MARK')

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
  const memo = []
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
      case OP.MARK:
        stack.push(MARK_SENTINEL)
        break
      case OP.SETITEMS: {
        // Pop pairs down to MARK, assign into the dict just below MARK.
        const items = []
        while (stack[stack.length - 1] !== MARK_SENTINEL) {
          items.unshift(stack.pop())
        }
        stack.pop() // discard MARK
        const target = stack[stack.length - 1]
        for (let i = 0; i < items.length; i += 2) {
          target[items[i]] = items[i + 1]
        }
        break
      }
      case OP.APPENDS: {
        // Pop items down to MARK, append to the list just below MARK.
        const items = []
        while (stack[stack.length - 1] !== MARK_SENTINEL) {
          items.unshift(stack.pop())
        }
        stack.pop() // discard MARK
        const target = stack[stack.length - 1]
        for (const item of items) target.push(item)
        break
      }
      case OP.TUPLE: {
        // Pop items down to MARK and push them as an array (tuples → arrays in JS).
        const items = []
        while (stack[stack.length - 1] !== MARK_SENTINEL) {
          items.unshift(stack.pop())
        }
        stack.pop() // discard MARK
        stack.push(items)
        break
      }
      case OP.TUPLE1: {
        const a = stack.pop()
        stack.push([a])
        break
      }
      case OP.TUPLE2: {
        const b = stack.pop()
        const a = stack.pop()
        stack.push([a, b])
        break
      }
      case OP.TUPLE3: {
        const c = stack.pop()
        const b = stack.pop()
        const a = stack.pop()
        stack.push([a, b, c])
        break
      }
      case OP.MEMOIZE:
        memo.push(stack[stack.length - 1])
        break
      case OP.BINGET: {
        const idx = reader.readByte()
        stack.push(memo[idx])
        break
      }
      case OP.LONG_BINGET: {
        const idx = reader.readUint32LE()
        stack.push(memo[idx])
        break
      }
      case OP.BINPUT: {
        const idx = reader.readByte()
        memo[idx] = stack[stack.length - 1]
        break
      }
      case OP.LONG_BINPUT: {
        const idx = reader.readUint32LE()
        memo[idx] = stack[stack.length - 1]
        break
      }
      default:
        throw new Error(`Unknown pickle opcode: 0x${op.toString(16).padStart(2, '0')}`)
    }
  }
}
