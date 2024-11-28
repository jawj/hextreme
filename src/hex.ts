export interface FromHexOptions {
  onInvalidInput?: 'throw' | 'truncate';
}

export interface _FromHexOptions extends FromHexOptions {
  scratchArr?: Uint16Array;
  outArr?: Uint8Array;
  indexOffset?: number;
}

const
  littleEndian = new Uint8Array((new Uint16Array([0x0102]).buffer))[0] === 0x02,
  chHex = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102],  // 0123456789abcdef
  chunkBytes = 1008000,  // must be divisible by 24; temporary buffer allocations (in bytes) are up to this value
  v00 = (48 << 8) | 48,
  vff = (102 << 8) | 102;  // vFF is smaller, so not relevant

let
  td: TextDecoder,
  te: TextEncoder,
  hl: Uint8Array,   // hex lookup
  cc: Uint16Array;  // char codes

// === encode ===

export function _toHex(d: Uint8Array | number[], scratchArr: Uint16Array) {
  if (!td) td = new TextDecoder();

  if (!cc) {
    cc = new Uint16Array(256);
    if (littleEndian) for (let i = 0; i < 256; i++) cc[i] = chHex[i & 0xF] << 8 | chHex[i >>> 4];
    else for (let i = 0; i < 256; i++) cc[i] = chHex[i & 0xF] | chHex[i >>> 4] << 8;
  }

  const
    len = d.length,
    last7 = len - 7,
    a = scratchArr || new Uint16Array(len);

  let i = 0;

  while (i < last7) {  // loop unrolling helps quite a bit in V8
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]]; // 4
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]]; // 8
  }
  while (i < len) {
    a[i] = cc[d[i++]];
  }

  const hex = td.decode(a.subarray(0, len));
  return hex;
}

export function _toHexChunked(d: Uint8Array) {
  let
    hex = '',
    len = d.length,
    chunkInts = chunkBytes >>> 1,
    chunks = Math.ceil(len / chunkInts),
    scratchArr = new Uint16Array(chunks > 1 ? chunkInts : len);

  for (let i = 0; i < chunks; i++) {
    const
      start = i * chunkInts,
      end = start + chunkInts;  // subarray has no problem going past the end of the array

    hex += _toHex(d.subarray(start, end), scratchArr);
  }

  return hex;
}

export function toHex(d: Uint8Array) {
  // @ts-expect-error TS doesn't know about toHex
  return typeof d.toHex === 'function' ? d.toHex() : _toHexChunked(d);
}

export function _fromHex(s: string, { onInvalidInput, scratchArr, outArr, indexOffset }: _FromHexOptions = {}) {
  // note: using a Map or a big switch/case block are both an order of magnitude slower than these TypedArray lookups
  if (!te) te = new TextEncoder();

  if (!hl) {  // one-time prep
    hl = new Uint8Array(vff + 1);  // hex lookup -- takes 26KB of memory (could halve that by doing vff - v00 + 1, but that's slower)

    for (let l = 0; l < 22; l++) for (let r = 0; r < 22; r++) {  // 484 unique possibilities, 00 – FF/ff/fF/Ff
      const
        cl = l + (l < 10 ? 48 : l < 16 ? 55 : 81),  // left-hand char codes, 0 - F/f
        cr = r + (r < 10 ? 48 : r < 16 ? 55 : 81),  // right-hand char code, 0 - F/f
        vin = littleEndian ? (cr << 8) | cl : cr | (cl << 8),
        vout = ((l < 16 ? l : l - 6) << 4) | (r < 16 ? r : r - 6);

      hl[vin] = vout;
    }
  }

  const
    lax = onInvalidInput === 'truncate',
    slen = s.length;

  if (!lax && slen & 1) throw new Error('Hex input is an odd number of characters');

  const
    bytelen = slen >>> 1,
    last7 = bytelen - 7,
    h16len = bytelen + 2,  // `+ 2` allows an extra 4 bytes: enough space for a 4-byte UTF-8 char to be encoded even at the end, so we can detect any multi-byte char
    h16 = scratchArr || new Uint16Array(h16len),
    h8 = new Uint8Array(h16.buffer),  // view onto same memory
    out = outArr || new Uint8Array(bytelen);

  if (h16.length < h16len) throw new Error(`Wrong-sized scratch array supplied (was ${h16.length}, expected at least ${h16len})`);
  if (out.length != bytelen) throw new Error(`Wrong-sized output array supplied (was ${out.length}, expected ${bytelen})`);

  te.encodeInto(s, h8);
  // we don't need to explicitly check for multibyte characters (via `result.written > slen`)
  // because any multi-byte character includes bytes that are outside the valid range

  let i = 0, ok = false;
  e: {
    let vin, vout;
    while (i < last7) {  // a bit of loop unrolling helps performance in V8
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== v00) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== v00) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== v00) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== v00) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== v00) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== v00) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== v00) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== v00) break e; out[i++] = vout;
    }
    while (i < bytelen) {
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== v00) break e; out[i++] = vout;
    }
    ok = true;
  }

  if (!ok && !lax) throw new Error(`Invalid pair in hex input at index ${(indexOffset || 0) + i << 1}`);
  return i < bytelen ? out.subarray(0, i) : out;
}

// === decode ===

export function _fromHexChunked(s: string, { onInvalidInput }: FromHexOptions = {}) {
  const
    lax = onInvalidInput === 'truncate',
    slen = s.length;

  // needs checking here because it will be rounded down to a multiple of two below
  if (!lax && slen & 1) throw new Error('Hex input is an odd number of characters');

  const
    byteLength = slen >>> 1,
    chunkInts = chunkBytes >>> 1,
    chunksCount = Math.ceil(byteLength / chunkInts),
    scratchArr = new Uint16Array((chunksCount > 1 ? chunkInts : byteLength) + 2),
    outArr = new Uint8Array(byteLength);

  for (let i = 0; i < chunksCount; i++) {
    const
      chunkStartByte = i * chunkInts,
      chunkEndByte = chunkStartByte + chunkInts,
      result = _fromHex(s.slice(chunkStartByte << 1, chunkEndByte << 1), {
        onInvalidInput,
        scratchArr,
        outArr: outArr.subarray(chunkStartByte, chunkEndByte),
        indexOffset: chunkStartByte
      });

    if (lax && result.length < chunkEndByte - chunkStartByte) {
      return outArr.subarray(0, chunkStartByte + result.length);
    }
  }

  return outArr;
}

export function fromHex(s: string, options: FromHexOptions = {}) {
  // @ts-expect-error TS doesn't know about fromHex
  return (options.onInvalidInput !== 'truncate' && typeof Uint8Array.fromHex === 'function') ? Uint8Array.fromHex(s) : _fromHexChunked(s, options);
}
