var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true,
writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// src/base64.ts
var littleEndian = new Uint8Array(new Uint32Array([16909060]).buffer)[0] === 4;
var chunkBytes = 1008e3;
var chStd = new Uint8Array([
  // ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/
  65,
  66,
  67,
  68,
  69,
  70,
  71,
  72,
  73,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  82,
  83,
  84,
  85,
  86,
  87,
  88,
  89,
  90,
  97,
  98,
  99,
  100,
  101,
  102,
  103,
  104,
  105,
  106,
  107,
  108,
  109,
  110,
  111,
  112,
  113,
  114,
  115,
  116,
  117,
  118,
  119,
  120,
  121,
  122,
  48,
  49,
  50,
  51,
  52,
  53,
  54,
  55,
  56,
  57,
  43,
  47
]);
var chPad = 61;
var chUrl = chStd.slice();
var vAA = 65 << 8 | 65;
var vzz = 122 << 8 | 122;
chUrl[62] = 45;
chUrl[63] = 95;
var td;
var te;
var chpairsStd;
var chpairsUrl;
var b64StdWordLookup;
var b64UrlWordLookup;
var b64StdByteLookup;
var b64UrlByteLookup;
function _toBase64(d, { omitPadding, alphabet, scratchArr } = {}) {
  if (!td) td = new TextDecoder();
  if (!chpairsStd) {
    chpairsStd = new Uint16Array(4096);
    if (littleEndian) for (let i2 = 0; i2 < 64; i2++) for (let j2 = 0; j2 < 64; j2++) chpairsStd[i2 <<
    6 | j2] = chStd[i2] | chStd[j2] << 8;
    else for (let i2 = 0; i2 < 64; i2++) for (let j2 = 0; j2 < 64; j2++) chpairsStd[i2 << 6 | j2] = chStd[i2] <<
    8 | chStd[j2];
    chpairsUrl = chpairsStd.slice();
    if (littleEndian) {
      for (let i2 = 0; i2 < 64; i2++) for (let j2 = 62; j2 < 64; j2++) chpairsUrl[i2 << 6 | j2] = chUrl[i2] |
      chUrl[j2] << 8;
      for (let i2 = 62; i2 < 64; i2++) for (let j2 = 0; j2 < 62; j2++) chpairsUrl[i2 << 6 | j2] = chUrl[i2] |
      chUrl[j2] << 8;
    } else {
      for (let i2 = 0; i2 < 64; i2++) for (let j2 = 62; j2 < 64; j2++) chpairsUrl[i2 << 6 | j2] = chUrl[i2] <<
      8 | chUrl[j2];
      for (let i2 = 62; i2 < 64; i2++) for (let j2 = 0; j2 < 62; j2++) chpairsUrl[i2 << 6 | j2] = chUrl[i2] <<
      8 | chUrl[j2];
    }
  }
  const urlsafe = alphabet === "base64url", ch = urlsafe ? chUrl : chStd, chpairs = urlsafe ? chpairsUrl :
  chpairsStd, inlen = d.length, last2 = inlen - 2, inints = inlen >>> 2, intlast3 = inints - 3, d32 = new Uint32Array(
  d.buffer, d.byteOffset, inints), outints = Math.ceil(inlen / 3), out = scratchArr || new Uint32Array(
  outints);
  let i = 0, j = 0, u1, u2, u3, b1, b2, b3;
  if (littleEndian) while (i < intlast3) {
    u1 = d32[i++];
    u2 = d32[i++];
    u3 = d32[i++];
    b1 = u1 & 255;
    b2 = u1 >>> 8 & 255;
    b3 = u1 >>> 16 & 255;
    out[j++] = chpairs[b1 << 4 | b2 >>> 4] | chpairs[(b2 & 15) << 8 | b3] << 16;
    b1 = u1 >>> 24;
    b2 = u2 & 255;
    b3 = u2 >>> 8 & 255;
    out[j++] = chpairs[b1 << 4 | b2 >>> 4] | chpairs[(b2 & 15) << 8 | b3] << 16;
    b1 = u2 >>> 16 & 255;
    b2 = u2 >>> 24;
    b3 = u3 & 255;
    out[j++] = chpairs[b1 << 4 | b2 >>> 4] | chpairs[(b2 & 15) << 8 | b3] << 16;
    b1 = u3 >>> 8 & 255;
    b2 = u3 >>> 16 & 255;
    b3 = u3 >>> 24;
    out[j++] = chpairs[b1 << 4 | b2 >>> 4] | chpairs[(b2 & 15) << 8 | b3] << 16;
  }
  else while (i < intlast3) {
    u1 = d32[i++];
    u2 = d32[i++];
    u3 = d32[i++];
    out[j++] = chpairs[u1 >>> 20] << 16 | chpairs[u1 >>> 8 & 4095];
    out[j++] = chpairs[(u1 & 255) << 4 | u2 >>> 28] << 16 | chpairs[u2 >>> 16 & 4095];
    out[j++] = chpairs[u2 >>> 4 & 4095] << 16 | chpairs[(u2 & 15) << 8 | u3 >>> 24];
    out[j++] = chpairs[u3 >>> 12 & 4095] << 16 | chpairs[u3 & 4095];
  }
  i = i << 2;
  while (i < last2) {
    b1 = d[i++];
    b2 = d[i++];
    b3 = d[i++];
    out[j++] = chpairs[b1 << 4 | b2 >>> 4] << (littleEndian ? 0 : 16) | chpairs[(b2 & 15) << 8 | b3] <<
    (littleEndian ? 16 : 0);
  }
  if (i === inlen) return td.decode(out);
  b1 = d[i++];
  b2 = d[i++];
  out[j++] = chpairs[b1 << 4 | (b2 || 0) >>> 4] << (littleEndian ? 0 : 16) | // first 16 bits (no padding)
  (b2 === void 0 ? chPad : ch[((b2 || 0) & 15) << 2]) << (littleEndian ? 16 : 8) | // next 8 bits
  chPad << (littleEndian ? 24 : 0);
  if (!omitPadding) return td.decode(out);
  let out8 = new Uint8Array(out.buffer, 0, (outints << 2) - (b2 === void 0 ? 2 : 1));
  return td.decode(out8);
}
function _toBase64Chunked(d, options = {}) {
  const inBytes = d.length, outInts = Math.ceil(inBytes / 3), outChunkInts = chunkBytes >>> 2, chunksCount = Math.
  ceil(outInts / outChunkInts), inChunkBytes = outChunkInts * 3, scratchArr = new Uint32Array(chunksCount >
  1 ? outChunkInts : outInts);
  let b64 = "";
  for (let i = 0; i < chunksCount; i++) {
    const startInBytes = i * inChunkBytes, endInBytes = startInBytes + inChunkBytes, startOutInts = i *
    outChunkInts, endOutInts = Math.min(startOutInts + outChunkInts, outInts);
    b64 += _toBase64(d.subarray(startInBytes, endInBytes), __spreadProps(__spreadValues({}, options),
    {
      scratchArr: scratchArr.subarray(0, endOutInts - startOutInts)
    }));
  }
  return b64;
}
function toBase64(d, options = {}) {
  return typeof d.toBase64 === "function" ? d.toBase64(options) : _toBase64Chunked(d, options);
}
function fromBase64(s, { alphabet, onInvalidInput, scratchArr, outArr } = {}) {
  if (!te) te = new TextEncoder();
  const lax = onInvalidInput === "skip", urlsafe = alphabet === "base64url";
  if (!urlsafe && !b64StdWordLookup) {
    b64StdWordLookup = new Uint16Array(vzz + 1);
    for (let l = 0; l < 64; l++) for (let r = 0; r < 64; r++) {
      const cl = chStd[l], cr = chStd[r], vin = littleEndian ? cr << 8 | cl : cr | cl << 8, vout = l <<
      6 | r;
      b64StdWordLookup[vin] = vout;
    }
  }
  if (urlsafe && !b64UrlWordLookup) {
    b64UrlWordLookup = new Uint16Array(vzz + 1);
    for (let l = 0; l < 64; l++) for (let r = 0; r < 64; r++) {
      const cl = chUrl[l], cr = chUrl[r], vin = littleEndian ? cr << 8 | cl : cr | cl << 8, vout = l <<
      6 | r;
      b64UrlWordLookup[vin] = vout;
    }
  }
  if (!b64StdByteLookup) {
    b64StdByteLookup = new Uint8Array(256).fill(128);
    b64StdByteLookup[chPad] = b64StdByteLookup[9] = b64StdByteLookup[10] = b64StdByteLookup[13] = b64StdByteLookup[32] =
    64;
    b64UrlByteLookup = new Uint8Array(256).fill(128);
    b64UrlByteLookup[chPad] = b64UrlByteLookup[9] = b64UrlByteLookup[10] = b64UrlByteLookup[13] = b64UrlByteLookup[32] =
    64;
    for (let i2 = 0; i2 < 64; i2++) b64StdByteLookup[chStd[i2]] = b64UrlByteLookup[chUrl[i2]] = i2;
  }
  const strlen = s.length, inIntsLen = Math.ceil(strlen / 4), inIntsLenPlus = inIntsLen + 1, fastIntsLen = inIntsLen -
  4, inInts = scratchArr || new Uint32Array(inIntsLenPlus), inBytes = new Uint8Array(inInts.buffer, 0,
  strlen), maxOutBytesLen = inIntsLen * 3, outBytes = outArr || new Uint8Array(maxOutBytesLen), outInts = new Uint32Array(
  outBytes.buffer, 0, outBytes.length >>> 2), b64WordLookup = urlsafe ? b64UrlWordLookup : b64StdWordLookup,
  b64ByteLookup = urlsafe ? b64UrlByteLookup : b64StdByteLookup;
  te.encodeInto(s, inBytes);
  let i = 0, j = 0, inInt, inL, inR, vL1, vR1, vL2, vR2, vL3, vR3, vL4, vR4;
  if (littleEndian) while (i < fastIntsLen) {
    inInt = inInts[i++];
    inL = inInt & 65535;
    vL1 = b64WordLookup[inL];
    if (!vL1 && inL !== vAA) {
      i -= 1;
      break;
    }
    inR = inInt >>> 16;
    vR1 = b64WordLookup[inR];
    if (!vR1 && inR !== vAA) {
      i -= 1;
      break;
    }
    inInt = inInts[i++];
    inL = inInt & 65535;
    vL2 = b64WordLookup[inL];
    if (!vL2 && inL !== vAA) {
      i -= 2;
      break;
    }
    inR = inInt >>> 16;
    vR2 = b64WordLookup[inR];
    if (!vR2 && inR !== vAA) {
      i -= 2;
      break;
    }
    inInt = inInts[i++];
    inL = inInt & 65535;
    vL3 = b64WordLookup[inL];
    if (!vL3 && inL !== vAA) {
      i -= 3;
      break;
    }
    inR = inInt >>> 16;
    vR3 = b64WordLookup[inR];
    if (!vR3 && inR !== vAA) {
      i -= 3;
      break;
    }
    inInt = inInts[i++];
    inL = inInt & 65535;
    vL4 = b64WordLookup[inL];
    if (!vL4 && inL !== vAA) {
      i -= 4;
      break;
    }
    inR = inInt >>> 16;
    vR4 = b64WordLookup[inR];
    if (!vR4 && inR !== vAA) {
      i -= 4;
      break;
    }
    outInts[j++] = vL1 >>> 4 | ((vL1 << 4 | vR1 >>> 8) & 255) << 8 | (vR1 & 255) << 16 | vL2 >>> 4 <<
    24;
    outInts[j++] = (vL2 << 4 | vR2 >>> 8) & 255 | (vR2 & 255) << 8 | vL3 >>> 4 << 16 | ((vL3 << 4 | vR3 >>>
    8) & 255) << 24;
    outInts[j++] = vR3 & 255 | vL4 >>> 4 << 8 | ((vL4 << 4 | vR4 >>> 8) & 255) << 16 | (vR4 & 255) <<
    24;
  }
  else while (i < fastIntsLen) {
    inInt = inInts[i++];
    inL = inInt >>> 16;
    vL1 = b64WordLookup[inL];
    if (!vL1 && inL !== vAA) {
      i -= 1;
      break;
    }
    inR = inInt & 65535;
    vR1 = b64WordLookup[inR];
    if (!vR1 && inR !== vAA) {
      i -= 1;
      break;
    }
    inInt = inInts[i++];
    inL = inInt >>> 16;
    vL2 = b64WordLookup[inL];
    if (!vL2 && inL !== vAA) {
      i -= 2;
      break;
    }
    inR = inInt & 65535;
    vR2 = b64WordLookup[inR];
    if (!vR2 && inR !== vAA) {
      i -= 2;
      break;
    }
    inInt = inInts[i++];
    inL = inInt >>> 16;
    vL3 = b64WordLookup[inL];
    if (!vL3 && inL !== vAA) {
      i -= 3;
      break;
    }
    inR = inInt & 65535;
    vR3 = b64WordLookup[inR];
    if (!vR3 && inR !== vAA) {
      i -= 3;
      break;
    }
    inInt = inInts[i++];
    inL = inInt >>> 16;
    vL4 = b64WordLookup[inL];
    if (!vL4 && inL !== vAA) {
      i -= 4;
      break;
    }
    inR = inInt & 65535;
    vR4 = b64WordLookup[inR];
    if (!vR4 && inR !== vAA) {
      i -= 4;
      break;
    }
    outInts[j++] = vL1 << 20 | vR1 << 8 | vL2 >>> 4;
    outInts[j++] = (vL2 & 15) << 28 | vR2 << 16 | vL3 << 4 | vR3 >>> 8;
    outInts[j++] = (vR3 & 255) << 24 | vL4 << 12 | vR4;
  }
  i <<= 2;
  j <<= 2;
  let i0 = 0, ok = false, v1, v2, v3, v4;
  e: {
    if (lax) while (i < strlen) {
      i0 = i;
      do {
        v1 = b64ByteLookup[inBytes[i++]];
      } while (v1 > 63);
      do {
        v2 = b64ByteLookup[inBytes[i++]];
      } while (v2 > 63);
      do {
        v3 = b64ByteLookup[inBytes[i++]];
      } while (v3 > 63);
      do {
        v4 = b64ByteLookup[inBytes[i++]];
      } while (v4 > 63);
      outBytes[j++] = v1 << 2 | v2 >>> 4;
      outBytes[j++] = (v2 << 4 | v3 >>> 2) & 255;
      outBytes[j++] = (v3 << 6 | v4) & 255;
    }
    else while (i < strlen) {
      i0 = i;
      do {
        v1 = b64ByteLookup[inBytes[i++]];
      } while (v1 === 64);
      if (v1 === 128) break e;
      do {
        v2 = b64ByteLookup[inBytes[i++]];
      } while (v2 === 64);
      if (v2 === 128) break e;
      do {
        v3 = b64ByteLookup[inBytes[i++]];
      } while (v3 === 64);
      if (v3 === 128) break e;
      do {
        v4 = b64ByteLookup[inBytes[i++]];
      } while (v4 === 64);
      if (v4 === 128) break e;
      outBytes[j++] = v1 << 2 | v2 >>> 4;
      outBytes[j++] = (v2 << 4 | v3 >>> 2) & 255;
      outBytes[j++] = (v3 << 6 | v4) & 255;
    }
    ok = true;
  }
  if (!ok) throw new Error(`Invalid character in base64 at index ${i - 1}`);
  let validChars = 0;
  for (let i2 = i0; i2 < strlen; i2++) if (b64ByteLookup[inBytes[i2]] < 64) validChars++;
  const truncateBytes = { 4: 0, 3: 1, 2: 2, 1: 2, 0: 3 }[validChars];
  return outBytes.subarray(0, j - truncateBytes);
}

// src/hex.ts
var littleEndian2 = new Uint8Array(new Uint16Array([258]).buffer)[0] === 2;
var hexCharsLower = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102];
var hexCharsUpper = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70];
var chunkBytes2 = 1008e3;
var v00 = 48 << 8 | 48;
var vff = 102 << 8 | 102;
var td2;
var te2;
var hl;
var ccl;
var ccu;
function _toHex(d, { alphabet, scratchArr } = {}) {
  if (!td2) td2 = new TextDecoder();
  if (!ccl) {
    ccl = new Uint16Array(256);
    ccu = new Uint16Array(256);
    if (littleEndian2) for (let i2 = 0; i2 < 256; i2++) {
      ccl[i2] = hexCharsLower[i2 & 15] << 8 | hexCharsLower[i2 >>> 4];
      ccu[i2] = hexCharsUpper[i2 & 15] << 8 | hexCharsUpper[i2 >>> 4];
    }
    else for (let i2 = 0; i2 < 256; i2++) {
      ccl[i2] = hexCharsLower[i2 & 15] | hexCharsLower[i2 >>> 4] << 8;
      ccu[i2] = hexCharsUpper[i2 & 15] | hexCharsUpper[i2 >>> 4] << 8;
    }
  }
  const len = d.length, last7 = len - 7, a = scratchArr || new Uint16Array(len), cc = alphabet === "\
upper" ? ccu : ccl;
  let i = 0;
  while (i < last7) {
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
    a[i] = cc[d[i++]];
  }
  while (i < len) {
    a[i] = cc[d[i++]];
  }
  const hex = td2.decode(a.subarray(0, len));
  return hex;
}
function _toHexChunked(d, options = {}) {
  let hex = "", len = d.length, chunkInts = chunkBytes2 >>> 1, chunks = Math.ceil(len / chunkInts), scratchArr = new Uint16Array(
  chunks > 1 ? chunkInts : len);
  for (let i = 0; i < chunks; i++) {
    const start = i * chunkInts, end = start + chunkInts;
    hex += _toHex(d.subarray(start, end), __spreadProps(__spreadValues({}, options), { scratchArr }));
  }
  return hex;
}
function toHex(d, options = {}) {
  return options.alphabet !== "upper" && typeof d.toHex === "function" ? d.toHex() : _toHexChunked(d,
  options);
}
function _fromHex(s, { onInvalidInput, scratchArr, outArr, indexOffset } = {}) {
  if (!te2) te2 = new TextEncoder();
  if (!hl) {
    hl = new Uint8Array(vff + 1);
    for (let l = 0; l < 22; l++) for (let r = 0; r < 22; r++) {
      const cl = l + (l < 10 ? 48 : l < 16 ? 55 : 81), cr = r + (r < 10 ? 48 : r < 16 ? 55 : 81), vin = littleEndian2 ?
      cr << 8 | cl : cr | cl << 8, vout = (l < 16 ? l : l - 6) << 4 | (r < 16 ? r : r - 6);
      hl[vin] = vout;
    }
  }
  const lax = onInvalidInput === "truncate", slen = s.length;
  if (!lax && slen & 1) throw new Error("Hex input is an odd number of characters");
  const bytelen = slen >>> 1, last7 = bytelen - 7, h16len = bytelen + 2, h16 = scratchArr || new Uint16Array(
  h16len), h8 = new Uint8Array(h16.buffer), out = outArr || new Uint8Array(bytelen);
  if (h16.length < h16len) throw new Error(`Wrong-sized scratch array supplied (was ${h16.length}, e\
xpected at least ${h16len})`);
  if (out.length != bytelen) throw new Error(`Wrong-sized output array supplied (was ${out.length}, \
expected ${bytelen})`);
  te2.encodeInto(s, h8);
  let i = 0, ok = false;
  e: {
    let vin, vout;
    while (i < last7) {
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== v00) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== v00) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== v00) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== v00) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== v00) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== v00) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== v00) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== v00) break e;
      out[i++] = vout;
    }
    while (i < bytelen) {
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== v00) break e;
      out[i++] = vout;
    }
    ok = true;
  }
  if (!ok && !lax) throw new Error(`Invalid pair in hex input at index ${(indexOffset || 0) + i << 1}`);
  return i < bytelen ? out.subarray(0, i) : out;
}
function _fromHexChunked(s, { onInvalidInput } = {}) {
  const lax = onInvalidInput === "truncate", slen = s.length;
  if (!lax && slen & 1) throw new Error("Hex input is an odd number of characters");
  const byteLength = slen >>> 1, chunkInts = chunkBytes2 >>> 1, chunksCount = Math.ceil(byteLength /
  chunkInts), scratchArr = new Uint16Array((chunksCount > 1 ? chunkInts : byteLength) + 2), outArr = new Uint8Array(
  byteLength);
  for (let i = 0; i < chunksCount; i++) {
    const chunkStartByte = i * chunkInts, chunkEndByte = chunkStartByte + chunkInts, result = _fromHex(
    s.slice(chunkStartByte << 1, chunkEndByte << 1), {
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
function fromHex(s, options = {}) {
  return options.onInvalidInput !== "truncate" && typeof Uint8Array.fromHex === "function" ? Uint8Array.
  fromHex(s) : _fromHexChunked(s, options);
}
export {
  _fromHex,
  _fromHexChunked,
  _toBase64,
  _toBase64Chunked,
  _toHex,
  _toHexChunked,
  fromBase64,
  fromHex,
  toBase64,
  toHex
};
