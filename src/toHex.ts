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

export function _toHex(d: Uint8Array | number[], { alphabet, scratchArr }: _ToHexOptions = {}) {
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
    len = d.length,
    last7 = len - 7,
    a = scratchArr || new Uint16Array(len),
    cc = alphabet === 'upper' ? ccu : ccl;

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

export function _toHexChunked(d: Uint8Array, options: ToHexOptions = {}) {
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

    hex += _toHex(d.subarray(start, end), { ...options, scratchArr });
  }

  return hex;
}

export function toHex(d: Uint8Array, options: ToHexOptions = {}) {
  // @ts-expect-error TS doesn't know about toHex
  return options.alphabet !== 'upper' && typeof d.toHex === 'function' ? d.toHex() as string : _toHexChunked(d, options);
}
