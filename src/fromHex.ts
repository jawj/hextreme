import {
  littleEndian,
  chunkBytes,
  te,
} from './common';

export interface FromHexOptions {
  onInvalidInput?: 'throw' | 'truncate';
  outArray?: Uint8Array;
}

export interface _FromHexOptions extends FromHexOptions {
  scratchArray?: Uint16Array;
  indexOffset?: number;
}

const
  // v00 = 12336,  // (48 << 8) | 48 -- now used directly in the source
  vff = 26214;  // (102 << 8) | 102 (vFF is smaller, so not relevant)

let hl: Uint8Array;    // hex lookup

export function _fromHex(s: string, { onInvalidInput, scratchArray: scratchArr, outArray: outArr, indexOffset }: _FromHexOptions = {}) {
  // note: using a Map or a big switch/case block are both an order of magnitude slower than these TypedArray lookups

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
    h8 = new Uint8Array(h16.buffer, h16.byteOffset),  // view onto same memory
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
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== 12336) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== 12336) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== 12336) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== 12336) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== 12336) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== 12336) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== 12336) break e; out[i++] = vout;
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== 12336) break e; out[i++] = vout;
    }
    while (i < bytelen) {
      vin = h16[i]; vout = hl[vin]; if (!vout && vin !== 12336) break e; out[i++] = vout;
    }
    ok = true;
  }

  if (!ok && !lax) throw new Error(`Invalid pair in hex input at index ${(indexOffset || 0) + i << 1}`);
  return i < bytelen ? out.subarray(0, i) : out;
}

export function _fromHexChunked(s: string, { onInvalidInput, outArray }: FromHexOptions = {}) {
  const
    lax = onInvalidInput === 'truncate',
    slen = s.length;

  // needs checking here because it will be rounded down to a multiple of two below
  if (!lax && slen & 1) throw new Error('Hex input is an odd number of characters');

  const
    byteLength = slen >>> 1,
    chunkInts = chunkBytes >>> 1,
    chunksCount = Math.ceil(byteLength / chunkInts),
    scratchArr = new Uint16Array((chunksCount > 1 ? chunkInts : byteLength) + 2),  // + 2 allows for a multi-byte character to be decoded (and thus detected) at the end
    outArr = outArray || new Uint8Array(byteLength);

  if (outArr.length !== byteLength) throw new Error(`Provided output array is of wrong length: expected ${byteLength}, got ${outArr.length}`);

  for (let i = 0; i < chunksCount; i++) {
    const
      chunkStartByte = i * chunkInts,
      chunkEndByte = chunkStartByte + chunkInts,
      result = _fromHex(s.slice(chunkStartByte << 1, chunkEndByte << 1), {
        onInvalidInput,
        scratchArray: scratchArr,
        outArray: outArr.subarray(chunkStartByte, chunkEndByte),
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
  if (typeof Uint8Array.fromHex === 'function' && options.onInvalidInput !== 'truncate' && !options.outArray) return Uint8Array.fromHex(s);
  return _fromHexChunked(s, options);
}
