const
  littleEndian = new Uint8Array((new Uint16Array([0x0102]).buffer))[0] === 0x02,
  chunkBytes = 1008000;  // must be divisible by 24; temporary buffer allocations (in bytes) are up to this value

let td, te;  // TextEncoder, TextDecoder

// hex

const chHex = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102];  // 0123456789abcdef
let cc;

export function _toHex(d, scratchArr) {
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

export function _toHexChunked(d) {
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

export function toHex(d) {
  return typeof d.toHex === 'function' ? d.toHex() : _toHexChunked(d);
}


let hl, v00, vff;

export function _fromHex(s, lax, outArr, scratchArr, indexOffset) {
  // note: using a Map or a big switch/case block are both an order of magnitude slower than these TypedArray lookups
  if (!te) te = new TextEncoder();

  if (!hl) {  // one-time prep
    v00 = (48 << 8) | 48;
    vff = (102 << 8) | 102;  // vFF is smaller, so not relevant
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

  const slen = s.length;
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

export function _fromHexChunked(s, lax) {
  const slen = s.length;

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
      result = _fromHex(
        s.slice(chunkStartByte << 1, chunkEndByte << 1),
        lax,
        outArr.subarray(chunkStartByte, chunkEndByte),
        scratchArr,
        chunkStartByte,
      );

    if (lax && result.length < chunkEndByte - chunkStartByte) {
      return outArr.subarray(0, chunkStartByte + result.length);
    }
  }

  return outArr;
}

export function fromHex(s, lax) {
  return (!lax && typeof Uint8Array.fromHex === 'function') ? Uint8Array.fromHex(s) : _fromHexChunked(s, lax);
}

// base64

const
  chStd = new Uint8Array([  // ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/
    65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
    89, 90, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
    115, 116, 117, 118, 119, 120, 121, 122, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 43, 47
  ]),
  chPad = 61,  // =
  chUrl = chStd.slice();

chUrl[62] = 45;  // -
chUrl[63] = 95;  // _

let chpairsStd, chpairsUrl;

export function _toBase64(d, pad, urlsafe, scratchArr) {
  if (!td) td = new TextDecoder();

  if (!chpairsStd) {  // one-time prep: look-up tables use just over 16KiB of memory

    // lookup tables for standard hex-char pairs
    chpairsStd = new Uint16Array(4096);  // this lookup table uses 8KB
    if (littleEndian) for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) chpairsStd[i << 6 | j] = chStd[i] | chStd[j] << 8;
    else for (let i = 0; i < 64; i++) for (let j = 0; j < 64; j++) chpairsStd[i << 6 | j] = chStd[i] << 8 | chStd[j];

    // lookup table diffs for url-safe hex-chars and hex-char pairs

    chpairsUrl = chpairsStd.slice();
    if (littleEndian) {
      for (let i = 0; i < 64; i++) for (let j = 62; j < 64; j++) chpairsUrl[i << 6 | j] = chUrl[i] | chUrl[j] << 8;
      for (let i = 62; i < 64; i++) for (let j = 0; j < 62; j++) chpairsUrl[i << 6 | j] = chUrl[i] | chUrl[j] << 8;  // j < 62 avoids overlap

    } else {
      for (let i = 0; i < 64; i++) for (let j = 62; j < 64; j++) chpairsUrl[i << 6 | j] = chUrl[i] << 8 | chUrl[j];
      for (let i = 62; i < 64; i++) for (let j = 0; j < 62; j++) chpairsUrl[i << 6 | j] = chUrl[i] << 8 | chUrl[j];  // j < 62 avoids overlap
    }
  }

  const
    ch = urlsafe ? chUrl : chStd,
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
    (b2 === undefined ? chPad : ch[(((b2 || 0) & 15) << 2)]) << (littleEndian ? 16 : 8) |  // next 8 bits
    chPad << (littleEndian ? 24 : 0);  // next 8 bits

  if (pad) return td.decode(out);  // if we're padding the end, we're golden

  // OK, we aren't padding the end, so truncate the output by viewing it as a Uint8Array
  let out8 = new Uint8Array(out.buffer, 0, (outints << 2) - (b2 === undefined ? 2 : 1));
  return td.decode(out8);
}

export function _toBase64Chunked(d, pad, urlsafe) {
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

    b64 += _toBase64(
      d.subarray(startInBytes, endInBytes),
      pad,
      urlsafe,
      scratchArr.subarray(0, endOutInts - startOutInts)
    );
  }

  return b64;
}

export function toBase64(d, pad, urlsafe) {
  return typeof d.toBase64 === 'function' ?
    d.toBase64({ alphabet: urlsafe ? 'base64url' : 'base64', omitPadding: !pad }) :
    _toBase64Chunked(d, pad, urlsafe);
}

let b64StdWordLookup, b64StdByteLookup, b64UrlByteLookup, vAA, vzz;

export function fromBase64(s, urlsafe, lax, scratchArr, outArr) {
  if (!te) te = new TextEncoder();

  if (!b64StdWordLookup) {
    // Uint16 lookups
    vAA = (65 << 8) | 65;    // signifies zero value
    vzz = (122 << 8) | 122;  // vZZ is smaller, so not relevant
    b64StdWordLookup = new Uint16Array(vzz + 1);  // base64 lookup -- takes ~62KB of memory

    for (let l = 0; l < 64; l++) for (let r = 0; r < 64; r++) {
      const
        cl = chStd[l],
        cr = chStd[r],
        vin = littleEndian ? (cr << 8) | cl : cr | (cl << 8),
        vout = l << 6 | r;

      b64StdWordLookup[vin] = vout;
    }

    // Uint8 lookups
    b64StdByteLookup = new Uint8Array(256).fill(128);  // 128 means: invalid character
    b64StdByteLookup[chPad] = b64StdByteLookup[9] = b64StdByteLookup[10] = b64StdByteLookup[13] = b64StdByteLookup[32] = 64;  // 64 means: whitespace or padding
    b64UrlByteLookup = new Uint8Array(256).fill(128);
    b64UrlByteLookup[chPad] = b64UrlByteLookup[9] = b64UrlByteLookup[10] = b64UrlByteLookup[13] = b64UrlByteLookup[32] = 64;

    for (let i = 0; i < 64; i++) {
      b64StdByteLookup[chStd[i]] = i;  // 6-bit values mean themselves
      b64UrlByteLookup[chUrl[i]] = i;
    }
  }

  const
    strlen = s.length,
    inIntsLen = Math.ceil(strlen / 4),
    inIntsLenPlus = inIntsLen + 1,  // `+ 1` allows an extra 4 bytes: enough space for a 4-byte UTF-8 char to be encoded even at the end, so we can detect any multi-byte char
    fastIntsLen = inIntsLen - 4,  // 4 bytes per Uint32, and we want to work in groups of 4, plus avoid the last 2 bytes (which may be padding)
    inInts = scratchArr || new Uint32Array(inIntsLenPlus),
    inBytes = new Uint8Array(inInts.buffer, 0, strlen),  // view onto same memory
    maxOutBytesLen = inIntsLen * 3,
    outBytes = outArr || new Uint8Array(maxOutBytesLen),
    outInts = new Uint32Array(outBytes.buffer, 0, outBytes.length >>> 2),
    b64ByteLookup = urlsafe ? b64UrlByteLookup : b64StdByteLookup;

  te.encodeInto(s, inBytes);
  // we don't need to explicitly check for multibyte characters (via `result.written > strlen`)
  // because any multi-byte character includes bytes that are outside the valid range

  let i = 0, j = 0, inInt, inL, inR, vL1, vR1, vL2, vR2, vL3, vR3, vL4, vR4;
  if (littleEndian) while (i < fastIntsLen) {  // while we can, read 4x uint32 (16 bytes) + write 3x uint32 (12 bytes)
    inInt = inInts[i++];
    inL = inInt & 65535;
    vL1 = b64StdWordLookup[inL];
    if (!vL1 && inL !== vAA) { i -= 1; break; }
    inR = inInt >>> 16;
    vR1 = b64StdWordLookup[inR];
    if (!vR1 && inR !== vAA) { i -= 1; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    vL2 = b64StdWordLookup[inL];
    if (!vL2 && inL !== vAA) { i -= 2; break; }
    inR = inInt >>> 16;
    vR2 = b64StdWordLookup[inR];
    if (!vR2 && inR !== vAA) { i -= 2; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    vL3 = b64StdWordLookup[inL];
    if (!vL3 && inL !== vAA) { i -= 3; break; }
    inR = inInt >>> 16;
    vR3 = b64StdWordLookup[inR];
    if (!vR3 && inR !== vAA) { i -= 3; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    vL4 = b64StdWordLookup[inL];
    if (!vL4 && inL !== vAA) { i -= 4; break; }
    inR = inInt >>> 16;
    vR4 = b64StdWordLookup[inR];
    if (!vR4 && inR !== vAA) { i -= 4; break; }

    outInts[j++] =
      vL1 >>> 4 |
      ((vL1 << 4 | vR1 >>> 8) & 255) << 8 |
      (vR1 & 255) << 16 |
      (vL2 >>> 4) << 24;

    outInts[j++] =
      ((vL2 << 4 | vR2 >>> 8) & 255) |
      (vR2 & 255) << 8 |
      (vL3 >>> 4) << 16 |
      ((vL3 << 4 | vR3 >>> 8) & 255) << 24;

    outInts[j++] =
      vR3 & 255 |
      (vL4 >>> 4) << 8 |
      ((vL4 << 4 | vR4 >>> 8) & 255) << 16 |
      (vR4 & 255) << 24;
  }
  else while (i < fastIntsLen) {
    inInt = inInts[i++];
    inL = inInt >>> 16;
    vL1 = b64StdWordLookup[inL];
    if (!vL1 && inL !== vAA) { i -= 1; break; }
    inR = inInt & 65535;
    vR1 = b64StdWordLookup[inR];
    if (!vR1 && inR !== vAA) { i -= 1; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    vL2 = b64StdWordLookup[inL];
    if (!vL2 && inL !== vAA) { i -= 2; break; }
    inR = inInt & 65535;
    vR2 = b64StdWordLookup[inR];
    if (!vR2 && inR !== vAA) { i -= 2; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    vL3 = b64StdWordLookup[inL];
    if (!vL3 && inL !== vAA) { i -= 3; break; }
    inR = inInt & 65535;
    vR3 = b64StdWordLookup[inR];
    if (!vR3 && inR !== vAA) { i -= 3; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    vL4 = b64StdWordLookup[inL];
    if (!vL4 && inL !== vAA) { i -= 4; break; }
    inR = inInt & 65535;
    vR4 = b64StdWordLookup[inR];
    if (!vR4 && inR !== vAA) { i -= 4; break; }

    outInts[j++] = vL1 << 20 | vR1 << 8 | vL2 >>> 4;  // this is so much nicer in big-endian
    outInts[j++] = (vL2 & 15) << 28 | vR2 << 16 | vL3 << 4 | vR3 >>> 8;
    outInts[j++] = (vR3 & 255) << 24 | vL4 << 12 | vR4;
  }

  i <<= 2;  // translate Uint32 addressing to Uint8 addressing
  j <<= 2;

  let i0, v1, v2, v3, v4, ok = false;
  e: {
    if (lax) while (i < strlen) {
      i0 = i;
      do { v1 = b64ByteLookup[inBytes[i++]] } while (v1 > 63);
      do { v2 = b64ByteLookup[inBytes[i++]] } while (v2 > 63);
      do { v3 = b64ByteLookup[inBytes[i++]] } while (v3 > 63);
      do { v4 = b64ByteLookup[inBytes[i++]] } while (v4 > 63);

      outBytes[j++] = v1 << 2 | v2 >>> 4;
      outBytes[j++] = (v2 << 4 | v3 >>> 2) & 255;
      outBytes[j++] = (v3 << 6 | v4) & 255;
    }
    else while (i < strlen) {
      i0 = i;
      do { v1 = b64ByteLookup[inBytes[i++]] } while (v1 === 64);
      if (v1 === 128) break e;
      do { v2 = b64ByteLookup[inBytes[i++]] } while (v2 === 64);
      if (v2 === 128) break e;
      do { v3 = b64ByteLookup[inBytes[i++]] } while (v3 === 64);
      if (v3 === 128) break e;
      do { v4 = b64ByteLookup[inBytes[i++]] } while (v4 === 64);
      if (v4 === 128) break e;

      outBytes[j++] = v1 << 2 | v2 >>> 4;
      outBytes[j++] = (v2 << 4 | v3 >>> 2) & 255;
      outBytes[j++] = (v3 << 6 | v4) & 255;
    }
    ok = true;
  }

  if (!ok) throw new Error(`Invalid character in base64 at index ${i - 1}`);

  // if input string included padding and/or whitespace, it will need truncating
  // we need to count how many valid input characters (0 – 4) there are after i0

  let validChars = 0;
  for (let i = i0; i < strlen; i++) if (b64ByteLookup[inBytes[i]] < 64) validChars++;
  const truncateBytes = { 4: 0, 3: 1, 2: 2, 1: 2, 0: 3 }[validChars];
  return outBytes.subarray(0, j - truncateBytes);
}
