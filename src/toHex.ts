import {
  littleEndian,
  hexCharsLower as chLower,
  hexCharsUpper as chUpper,
  chunkBytes,
  td,
} from './common';

export interface ToHexOptions {
  alphabet?: 'lower' | 'upper';
}

export interface _ToHexOptions extends ToHexOptions {
  scratchArr?: Uint16Array;
}

let
  ccl: Uint16Array,  // char codes, lower case
  ccu: Uint16Array;

export function _toHex(d8: Uint8Array, { alphabet, scratchArr }: _ToHexOptions = {}) {
  if (!ccl) {
    ccl = new Uint16Array(256);
    ccu = new Uint16Array(256);
    if (littleEndian) for (let i = 0; i < 256; i++) {
      ccl[i] = chLower[i & 0xF] << 8 | chLower[i >>> 4];
      ccu[i] = chUpper[i & 0xF] << 8 | chUpper[i >>> 4];
    }
    else for (let i = 0; i < 256; i++) {
      ccl[i] = chLower[i & 0xF] | chLower[i >>> 4] << 8;
      ccu[i] = chUpper[i & 0xF] | chUpper[i >>> 4] << 8;
    }
  }

  const
    len = d8.length,
    halfLen = len >>> 1,
    quarterLen = len >>> 2,
    out16 = scratchArr || new Uint16Array(len),
    d32 = new Uint32Array(d8.buffer, d8.byteOffset, quarterLen),
    out32 = new Uint32Array(out16.buffer, out16.byteOffset, halfLen),
    cc = alphabet === 'upper' ? ccu : ccl;

  let i = 0, j = 0, v, v1, v2;
  if (littleEndian) while (i < quarterLen) {
    v = d32[i++];
    v1 = cc[v & 255];
    v2 = cc[(v >>> 8) & 255];
    out32[j++] = v2 << 16 | v1;
    v1 = cc[(v >>> 16) & 255];
    v2 = cc[v >>> 24];
    out32[j++] = v2 << 16 | v1;
  }
  else while (i < quarterLen) {
    v = d32[i++];
    v1 = cc[v >>> 24];
    v2 = cc[(v >>> 16) & 255];
    out32[j++] = v2 | v1 << 16;
    v1 = cc[(v >>> 8) & 255];
    v2 = cc[v & 255];
    out32[j++] = v2 | v1 << 16;
  }
  
  i <<= 2;  // uint32 addressing to uint8 addressing
  while (i < len) {
    out16[i] = cc[d8[i++]];
  }

  const hex = td.decode(out16.subarray(0, len));
  return hex;
}

export function _toHexChunked(d: Uint8Array, options: ToHexOptions = {}) {
  let
    hex = '',
    len = d.length,
    chunkWords = chunkBytes >>> 1,
    chunks = Math.ceil(len / chunkWords),
    scratchArr = new Uint16Array(chunks > 1 ? chunkWords : len);

  for (let i = 0; i < chunks; i++) {
    const
      start = i * chunkWords,
      end = start + chunkWords;  // subarray has no problem going past the end of the array

    hex += _toHex(d.subarray(start, end), { ...options, scratchArr });
  }

  return hex;
}

export function toHex(d: Uint8Array, options: ToHexOptions = {}) {
  // @ts-expect-error TS doesn't know about toHex
  return options.alphabet !== 'upper' && typeof d.toHex === 'function' ? d.toHex() as string : _toHexChunked(d, options);
}
