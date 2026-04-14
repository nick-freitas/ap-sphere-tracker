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
  STACK_GLOBAL: 0x93,
  REDUCE: 0x52,
  BUILD: 0x62,
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
      case OP.STACK_GLOBAL: {
        const name = stack.pop()
        const module = stack.pop()
        stack.push({ __class: 'reference', module, name })
        break
      }
      case OP.REDUCE: {
        const args = stack.pop()
        const classRef = stack.pop()
        stack.push({
          __class: 'instance',
          module: classRef.module,
          name: classRef.name,
          args,
          state: null,
        })
        break
      }
      case OP.BUILD: {
        const state = stack.pop()
        const instance = stack[stack.length - 1]
        instance.state = state
        break
      }
      default:
        throw new Error(`Unknown pickle opcode: 0x${op.toString(16).padStart(2, '0')}`)
    }
  }
}

// --- ZIP reader ----------------------------------------------------------

const EOCD_SIGNATURE = 0x06054b50
const CFH_SIGNATURE = 0x02014b50
const LFH_SIGNATURE = 0x04034b50

async function inflateRaw(bytes) {
  return new Uint8Array(
    await new Response(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    ).arrayBuffer()
  )
}

// Find the End of Central Directory record by scanning backwards.
function findEOCD(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // EOCD is at least 22 bytes, max 22 + 65535 bytes from the end (for comments).
  const minStart = Math.max(0, bytes.length - 22 - 65535)
  for (let i = bytes.length - 22; i >= minStart; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      return i
    }
  }
  throw new Error('ZIP: end-of-central-directory record not found')
}

export async function readZipArchipelagoEntry(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocdOffset = findEOCD(bytes)

  const totalEntries = view.getUint16(eocdOffset + 10, true)
  const centralDirOffset = view.getUint32(eocdOffset + 16, true)

  let cursor = centralDirOffset
  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(cursor, true) !== CFH_SIGNATURE) {
      throw new Error(`ZIP: invalid central directory header at offset ${cursor}`)
    }
    const method = view.getUint16(cursor + 10, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const uncompressedSize = view.getUint32(cursor + 24, true)
    const filenameLen = view.getUint16(cursor + 28, true)
    const extraLen = view.getUint16(cursor + 30, true)
    const commentLen = view.getUint16(cursor + 32, true)
    const lfhOffset = view.getUint32(cursor + 42, true)
    const filenameBytes = bytes.subarray(cursor + 46, cursor + 46 + filenameLen)
    const filename = new TextDecoder('utf-8').decode(filenameBytes)

    if (filename.endsWith('.archipelago')) {
      // Walk to the local file header to find the actual data offset.
      if (view.getUint32(lfhOffset, true) !== LFH_SIGNATURE) {
        throw new Error(`ZIP: invalid local file header at offset ${lfhOffset}`)
      }
      const lfhFilenameLen = view.getUint16(lfhOffset + 26, true)
      const lfhExtraLen = view.getUint16(lfhOffset + 28, true)
      const dataOffset = lfhOffset + 30 + lfhFilenameLen + lfhExtraLen
      const compressedData = bytes.subarray(dataOffset, dataOffset + compressedSize)

      if (method === 0) {
        // STORED — no compression
        return compressedData.slice() // return a copy so caller owns the buffer
      }
      if (method === 8) {
        // DEFLATE
        return await inflateRaw(compressedData)
      }
      throw new Error(`ZIP: unsupported compression method ${method} for .archipelago entry`)
    }

    cursor += 46 + filenameLen + extraLen + commentLen
  }

  throw new Error('ZIP: no .archipelago entry found')
}
