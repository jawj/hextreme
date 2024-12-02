import {
  littleEndian,
  chunkBytes,
  b64ChStd,
  b64ChUrl,
  b64ChPad,
  type Base64Options
} from './common';

export interface ToBase64Options extends Base64Options {
  omitPadding?: boolean;
}

export interface _ToBase64Options extends ToBase64Options {
  scratchArr?: Uint32Array;
}

let
  td: TextDecoder,
  chpairsStd: Uint16Array,
  chpairsUrl: Uint16Array;

export function _toBase64(d: Uint8Array, { omitPadding, alphabet, scratchArr }: _ToBase64Options = {}) {
  if (!td) td = new TextDecoder();

  if (!chpairsStd) {  // one-time prep: look-up tables use just over 16KiB of memory

    // lookup tables for standard hex-char pairs
    chpairsStd = new Uint16Array(4096);  // this lookup table uses 8KB
    if (littleEndian) for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) chpairsStd[i << 6 | j] = b64ChStd[i] | b64ChStd[j] << 8;
    else for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) chpairsStd[i << 6 | j] = b64ChStd[i] << 8 | b64ChStd[j];

    // lookup table diffs for url-safe hex-chars and hex-char pairs

    chpairsUrl = chpairsStd.slice();
    if (littleEndian) {
      for (let i = 0; i < 64; i++) for (let j = 62; j < 64; j++) chpairsUrl[i << 6 | j] = b64ChUrl[i] | b64ChUrl[j] << 8;
      for (let i = 62; i < 64; i++) for (let j = 0; j < 62; j++) chpairsUrl[i << 6 | j] = b64ChUrl[i] | b64ChUrl[j] << 8;  // j < 62 avoids overlap

    } else {
      for (let i = 0; i < 64; i++) for (let j = 62; j < 64; j++) chpairsUrl[i << 6 | j] = b64ChUrl[i] << 8 | b64ChUrl[j];
      for (let i = 62; i < 64; i++) for (let j = 0; j < 62; j++) chpairsUrl[i << 6 | j] = b64ChUrl[i] << 8 | b64ChUrl[j];  // j < 62 avoids overlap
    }
  }

  const
    urlsafe = alphabet === 'base64url',
    ch = urlsafe ? b64ChUrl : b64ChStd,
    chpairs = urlsafe ? chpairsUrl : chpairsStd,
    inlen = d.length,
    last2 = inlen - 2,
    inints = inlen >>> 2,  // divide by 4, round down
    intlast3 = inints - 3,
    d32 = new Uint32Array(d.buffer, d.byteOffset, inints),
    outints = Math.ceil(inlen / 3),
    out = scratchArr || new Uint32Array(outints);

  let i = 0, j = 0, u1, u2, u3, b1, b2, b3;

  if (littleEndian) while (i < intlast3) {  // while we can, read 3x uint32 (12 bytes) + write 4x uint32 (16 bytes)
    u1 = d32[i++];
    u2 = d32[i++];
    u3 = d32[i++];

    b1 = u1 & 255;
    b2 = (u1 >>> 8) & 255;
    b3 = (u1 >>> 16) & 255;
    out[j++] =
      chpairs[b1 << 4 | b2 >>> 4] |
      chpairs[(b2 & 15) << 8 | b3] << 16;

    b1 = u1 >>> 24;
    b2 = u2 & 255;
    b3 = (u2 >>> 8) & 255;
    out[j++] =
      chpairs[b1 << 4 | b2 >>> 4] |
      chpairs[(b2 & 15) << 8 | b3] << 16;

    b1 = (u2 >>> 16) & 255;
    b2 = u2 >>> 24;
    b3 = u3 & 255;
    out[j++] =
      chpairs[b1 << 4 | b2 >>> 4] |
      chpairs[(b2 & 15) << 8 | b3] << 16;

    b1 = (u3 >>> 8) & 255;
    b2 = (u3 >>> 16) & 255;
    b3 = u3 >>> 24;
    out[j++] =
      chpairs[b1 << 4 | b2 >>> 4] |
      chpairs[(b2 & 15) << 8 | b3] << 16;
  }

  else while (i < intlast3) {  // big-endian byte order makes life much easier here
    u1 = d32[i++];
    u2 = d32[i++];
    u3 = d32[i++];

    out[j++] =
      chpairs[u1 >>> 20] << 16 |
      chpairs[(u1 >>> 8) & 4095];

    out[j++] =
      chpairs[(u1 & 255) << 4 | u2 >>> 28] << 16 |
      chpairs[(u2 >>> 16) & 4095];

    out[j++] =
      chpairs[(u2 >>> 4) & 4095] << 16 |
      chpairs[(u2 & 15) << 8 | u3 >>> 24];

    out[j++] =
      chpairs[(u3 >>> 12) & 4095] << 16 |
      chpairs[u3 & 4095];
  }

  i = i << 2;  // * 4 -- translates from a uint32 index to a uint8 index

  while (i < last2) {  // mop up any remaining sequences of 3 input bytes
    b1 = d[i++];
    b2 = d[i++];
    b3 = d[i++];
    out[j++] =
      chpairs[b1 << 4 | b2 >>> 4] << (littleEndian ? 0 : 16) |
      chpairs[(b2 & 15) << 8 | b3] << (littleEndian ? 16 : 0);
  }

  if (i === inlen) return td.decode(out);  // implies input length divisible by 3, therefore no padding: we're done

  // OK, so there must be either 1 or 2 trailing input bytes
  b1 = d[i++];
  b2 = d[i++];
  out[j++] =
    chpairs[b1 << 4 | (b2 || 0) >>> 4] << (littleEndian ? 0 : 16) |  // first 16 bits (no padding)
    (b2 === undefined ? b64ChPad : ch[(((b2 || 0) & 15) << 2)]) << (littleEndian ? 16 : 8) |  // next 8 bits
    b64ChPad << (littleEndian ? 24 : 0);  // next 8 bits

  if (!omitPadding) return td.decode(out);  // if we're padding the end, we're golden

  // OK, we aren't padding the end, so truncate the output by viewing it as a Uint8Array
  let out8 = new Uint8Array(out.buffer, 0, (outints << 2) - (b2 === undefined ? 2 : 1));
  return td.decode(out8);
}

export function _toBase64Chunked(d: Uint8Array, options: ToBase64Options = {}) {
  const
    inBytes = d.length,
    outInts = Math.ceil(inBytes / 3),
    outChunkInts = chunkBytes >>> 2,  // divide by 4
    chunksCount = Math.ceil(outInts / outChunkInts),
    inChunkBytes = outChunkInts * 3,
    scratchArr = new Uint32Array(chunksCount > 1 ? outChunkInts : outInts);

  let b64 = '';
  for (let i = 0; i < chunksCount; i++) {
    const
      startInBytes = i * inChunkBytes,
      endInBytes = startInBytes + inChunkBytes,
      startOutInts = i * outChunkInts,
      endOutInts = Math.min(startOutInts + outChunkInts, outInts);

    b64 += _toBase64(d.subarray(startInBytes, endInBytes), {
      ...options,
      scratchArr: scratchArr.subarray(0, endOutInts - startOutInts)
    });
  }

  return b64;
}

export function toBase64(d: Uint8Array, options: ToBase64Options = {}) {
  // @ts-expect-error TS doesn't know about toBase64
  return typeof d.toBase64 === 'function' ? d.toBase64(options) as string : _toBase64Chunked(d, options);
}
