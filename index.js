"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true,
value }) : obj[key] = value;
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
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  _fromBase64: () => _fromBase64,
  _fromHex: () => _fromHex,
  _fromHexChunked: () => _fromHexChunked,
  _toBase64: () => _toBase64,
  _toBase64Chunked: () => _toBase64Chunked,
  _toHex: () => _toHex,
  _toHexChunked: () => _toHexChunked,
  fromBase64: () => fromBase64,
  fromHex: () => fromHex,
  toBase64: () => toBase64,
  toHex: () => toHex
});
module.exports = __toCommonJS(src_exports);

// src/common.ts
var chunkBytes = 1008e3;
var littleEndian = new Uint8Array(new Uint16Array([258]).buffer)[0] === 2;
var td = new TextDecoder();
var te = new TextEncoder();
var hexCharsLower = te.encode("0123456789abcdef");
var hexCharsUpper = te.encode("0123456789ABCDEF");
var b64ChStd = te.encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
var b64ChPad = 61;
var b64ChUrl = b64ChStd.slice();
b64ChUrl[62] = 45;
b64ChUrl[63] = 95;

// src/toHex.ts
var ccl;
var ccu;
function _toHex(d8, { alphabet, scratchArr } = {}) {
  if (!ccl) {
    ccl = new Uint16Array(256);
    ccu = new Uint16Array(256);
    if (littleEndian) for (let i2 = 0; i2 < 256; i2++) {
      ccl[i2] = hexCharsLower[i2 & 15] << 8 | hexCharsLower[i2 >>> 4];
      ccu[i2] = hexCharsUpper[i2 & 15] << 8 | hexCharsUpper[i2 >>> 4];
    }
    else for (let i2 = 0; i2 < 256; i2++) {
      ccl[i2] = hexCharsLower[i2 & 15] | hexCharsLower[i2 >>> 4] << 8;
      ccu[i2] = hexCharsUpper[i2 & 15] | hexCharsUpper[i2 >>> 4] << 8;
    }
  }
  const len = d8.length, halfLen = len >>> 1, quarterLen = len >>> 2, out16 = scratchArr || new Uint16Array(len), d32 = new Uint32Array(
  d8.buffer, d8.byteOffset, quarterLen), out32 = new Uint32Array(out16.buffer, out16.byteOffset, halfLen), cc = alphabet === "uppe\
r" ? ccu : ccl;
  let i = 0, j = 0, v;
  if (littleEndian) while (i < quarterLen) {
    v = d32[i++];
    out32[j++] = cc[v >>> 8 & 255] << 16 | cc[v & 255];
    out32[j++] = cc[v >>> 24] << 16 | cc[v >>> 16 & 255];
  }
  else while (i < quarterLen) {
    v = d32[i++];
    out32[j++] = cc[v >>> 24] << 16 | cc[v >>> 16 & 255];
    out32[j++] = cc[v >>> 8 & 255] << 16 | cc[v & 255];
  }
  i <<= 2;
  while (i < len) out16[i] = cc[d8[i++]];
  const hex = td.decode(out16.subarray(0, len));
  return hex;
}
function _toHexChunked(d, options = {}) {
  let hex = "", len = d.length, chunkWords = chunkBytes >>> 1, chunks = Math.ceil(len / chunkWords), scratchArr = new Uint16Array(
  chunks > 1 ? chunkWords : len);
  for (let i = 0; i < chunks; i++) {
    const start = i * chunkWords, end = start + chunkWords;
    hex += _toHex(d.subarray(start, end), __spreadProps(__spreadValues({}, options), { scratchArr }));
  }
  return hex;
}
function toHex(d, options = {}) {
  return options.alphabet !== "upper" && typeof d.toHex === "function" ? d.toHex() : _toHexChunked(d, options);
}

// src/fromHex.ts
var vff = 26214;
var hl;
function _fromHex(s, { onInvalidInput, scratchArr, outArr, indexOffset } = {}) {
  if (!hl) {
    hl = new Uint8Array(vff + 1);
    for (let l = 0; l < 22; l++) for (let r = 0; r < 22; r++) {
      const cl = l + (l < 10 ? 48 : l < 16 ? 55 : 81), cr = r + (r < 10 ? 48 : r < 16 ? 55 : 81), vin = littleEndian ? cr << 8 | cl :
      cr | cl << 8, vout = (l < 16 ? l : l - 6) << 4 | (r < 16 ? r : r - 6);
      hl[vin] = vout;
    }
  }
  const lax = onInvalidInput === "truncate", slen = s.length;
  if (!lax && slen & 1) throw new Error("Hex input is an odd number of characters");
  const bytelen = slen >>> 1, last7 = bytelen - 7, h16len = bytelen + 2, h16 = scratchArr || new Uint16Array(h16len), h8 = new Uint8Array(
  h16.buffer, h16.byteOffset), out = outArr || new Uint8Array(bytelen);
  if (h16.length < h16len) throw new Error(`Wrong-sized scratch array supplied (was ${h16.length}, expected at least ${h16len})`);
  if (out.length != bytelen) throw new Error(`Wrong-sized output array supplied (was ${out.length}, expected ${bytelen})`);
  te.encodeInto(s, h8);
  let i = 0, ok = false;
  e: {
    let vin, vout;
    while (i < last7) {
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== 12336) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== 12336) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== 12336) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== 12336) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== 12336) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== 12336) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== 12336) break e;
      out[i++] = vout;
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== 12336) break e;
      out[i++] = vout;
    }
    while (i < bytelen) {
      vin = h16[i];
      vout = hl[vin];
      if (!vout && vin !== 12336) break e;
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
  const byteLength = slen >>> 1, chunkInts = chunkBytes >>> 1, chunksCount = Math.ceil(byteLength / chunkInts), scratchArr = new Uint16Array(
  (chunksCount > 1 ? chunkInts : byteLength) + 2), outArr = new Uint8Array(byteLength);
  for (let i = 0; i < chunksCount; i++) {
    const chunkStartByte = i * chunkInts, chunkEndByte = chunkStartByte + chunkInts, result = _fromHex(s.slice(chunkStartByte << 1,
    chunkEndByte << 1), {
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
  return options.onInvalidInput !== "truncate" && typeof Uint8Array.fromHex === "function" ? Uint8Array.fromHex(s) : _fromHexChunked(
  s, options);
}

// src/toBase64.ts
var chpairsStd;
var chpairsUrl;
function _toBase64(d, { omitPadding, alphabet, scratchArr } = {}) {
  if (!chpairsStd) {
    chpairsStd = new Uint16Array(4096);
    if (littleEndian) for (let i2 = 0; i2 < 64; i2++) for (let j2 = 0; j2 < 64; j2++) chpairsStd[i2 << 6 | j2] = b64ChStd[i2] | b64ChStd[j2] <<
    8;
    else for (let i2 = 0; i2 < 64; i2++) for (let j2 = 0; j2 < 64; j2++) chpairsStd[i2 << 6 | j2] = b64ChStd[i2] << 8 | b64ChStd[j2];
    chpairsUrl = chpairsStd.slice();
    if (littleEndian) {
      for (let i2 = 0; i2 < 64; i2++) for (let j2 = 62; j2 < 64; j2++) chpairsUrl[i2 << 6 | j2] = b64ChUrl[i2] | b64ChUrl[j2] << 8;
      for (let i2 = 62; i2 < 64; i2++) for (let j2 = 0; j2 < 62; j2++) chpairsUrl[i2 << 6 | j2] = b64ChUrl[i2] | b64ChUrl[j2] << 8;
    } else {
      for (let i2 = 0; i2 < 64; i2++) for (let j2 = 62; j2 < 64; j2++) chpairsUrl[i2 << 6 | j2] = b64ChUrl[i2] << 8 | b64ChUrl[j2];
      for (let i2 = 62; i2 < 64; i2++) for (let j2 = 0; j2 < 62; j2++) chpairsUrl[i2 << 6 | j2] = b64ChUrl[i2] << 8 | b64ChUrl[j2];
    }
  }
  const urlsafe = alphabet === "base64url", ch = urlsafe ? b64ChUrl : b64ChStd, chpairs = urlsafe ? chpairsUrl : chpairsStd, inlen = d.
  length, last2 = inlen - 2, inints = inlen >>> 2, intlast3 = inints - 3, d32 = new Uint32Array(d.buffer, d.byteOffset, inints), outints = Math.
  ceil(inlen / 3), out = scratchArr || new Uint32Array(outints);
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
    out[j++] = chpairs[b1 << 4 | b2 >>> 4] << (littleEndian ? 0 : 16) | chpairs[(b2 & 15) << 8 | b3] << (littleEndian ? 16 : 0);
  }
  if (i === inlen) return td.decode(out);
  b1 = d[i++];
  b2 = d[i++];
  out[j++] = chpairs[b1 << 4 | (b2 || 0) >>> 4] << (littleEndian ? 0 : 16) | // first 16 bits (no padding)
  (b2 === void 0 ? b64ChPad : ch[((b2 || 0) & 15) << 2]) << (littleEndian ? 16 : 8) | // next 8 bits
  b64ChPad << (littleEndian ? 24 : 0);
  if (!omitPadding) return td.decode(out);
  let out8 = new Uint8Array(out.buffer, 0, (outints << 2) - (b2 === void 0 ? 2 : 1));
  return td.decode(out8);
}
function _toBase64Chunked(d, options = {}) {
  const inBytes = d.length, outInts = Math.ceil(inBytes / 3), outChunkInts = chunkBytes >>> 2, chunksCount = Math.ceil(outInts / outChunkInts),
  inChunkBytes = outChunkInts * 3, scratchArr = new Uint32Array(chunksCount > 1 ? outChunkInts : outInts);
  let b64 = "";
  for (let i = 0; i < chunksCount; i++) {
    const startInBytes = i * inChunkBytes, endInBytes = startInBytes + inChunkBytes, startOutInts = i * outChunkInts, endOutInts = Math.
    min(startOutInts + outChunkInts, outInts);
    b64 += _toBase64(d.subarray(startInBytes, endInBytes), __spreadProps(__spreadValues({}, options), {
      scratchArr: scratchArr.subarray(0, endOutInts - startOutInts)
    }));
  }
  return b64;
}
function toBase64(d, options = {}) {
  return typeof d.toBase64 === "function" ? d.toBase64(options) : _toBase64Chunked(d, options);
}

// src/fromBase64.ts
var vzz = 31354;
var stdWordLookup;
var urlWordLookup;
var anyWordLookup;
var stdByteLookup;
var urlByteLookup;
var anyByteLookup;
function _fromBase64(s, { alphabet, onInvalidInput } = {}) {
  const lax = onInvalidInput === "skip";
  if (alphabet !== "base64url" && alphabet !== "base64any" && !stdWordLookup) {
    stdWordLookup = new Uint16Array(vzz + 1);
    for (let l = 0; l < 64; l++) for (let r = 0; r < 64; r++) {
      const cl = b64ChStd[l], cr = b64ChStd[r], vin = littleEndian ? cr << 8 | cl : cr | cl << 8, vout = l << 6 | r;
      stdWordLookup[vin] = vout;
    }
  }
  if (alphabet === "base64url" && !urlWordLookup) {
    urlWordLookup = new Uint16Array(vzz + 1);
    for (let l = 0; l < 64; l++) for (let r = 0; r < 64; r++) {
      const cl = b64ChUrl[l], cr = b64ChUrl[r], vin = littleEndian ? cr << 8 | cl : cr | cl << 8, vout = l << 6 | r;
      urlWordLookup[vin] = vout;
    }
  }
  if (alphabet === "base64any" && !anyWordLookup) {
    anyWordLookup = new Uint16Array(vzz + 1);
    for (let l = 0; l < 64; l++) for (let r = 0; r < 64; r++) {
      const cl = b64ChStd[l], cr = b64ChStd[r], vin = littleEndian ? cr << 8 | cl : cr | cl << 8, vout = l << 6 | r;
      anyWordLookup[vin] = vout;
      if (l > 61 || r > 61) {
        const cl2 = b64ChUrl[l], cr2 = b64ChUrl[r], vin2 = littleEndian ? cr2 << 8 | cl2 : cr2 | cl2 << 8;
        anyWordLookup[vin2] = vout;
      }
    }
  }
  if (!stdByteLookup) {
    stdByteLookup = new Uint8Array(256).fill(66);
    urlByteLookup = new Uint8Array(256).fill(66);
    anyByteLookup = new Uint8Array(256).fill(66);
    stdByteLookup[b64ChPad] = urlByteLookup[b64ChPad] = anyByteLookup[b64ChPad] = 65;
    stdByteLookup[9] = stdByteLookup[10] = stdByteLookup[13] = stdByteLookup[32] = // tab, \r, \n, space
    urlByteLookup[9] = urlByteLookup[10] = urlByteLookup[13] = urlByteLookup[32] = anyByteLookup[9] = anyByteLookup[10] = anyByteLookup[13] =
    anyByteLookup[32] = 64;
    for (let i2 = 0; i2 < 64; i2++) {
      const chStdI = b64ChStd[i2], chUrlI = b64ChUrl[i2];
      stdByteLookup[chStdI] = urlByteLookup[chUrlI] = anyByteLookup[chStdI] = anyByteLookup[chUrlI] = i2;
    }
  }
  const strlen = s.length, inIntsLen = Math.ceil(strlen / 4), inIntsLenPlus = inIntsLen + 1, fastIntsLen = inIntsLen - 4, inInts = new Uint32Array(
  inIntsLenPlus), inBytes = new Uint8Array(inInts.buffer, 0, strlen), maxOutBytesLen = inIntsLen * 3, outBytes = new Uint8Array(maxOutBytesLen),
  outInts = new Uint32Array(outBytes.buffer, 0, outBytes.length >>> 2), wordLookup = alphabet === "base64url" ? urlWordLookup : alphabet ===
  "base64any" ? anyWordLookup : stdWordLookup, byteLookup = alphabet === "base64url" ? urlByteLookup : alphabet === "base64any" ? anyByteLookup :
  stdByteLookup;
  te.encodeInto(s, inBytes);
  let i = 0, j = 0, inInt, inL, inR, vL1, vR1, vL2, vR2, vL3, vR3, vL4, vR4;
  if (littleEndian) while (i < fastIntsLen) {
    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL1 = wordLookup[inL];
    vR1 = wordLookup[inR];
    if (!((vL1 || inL === 16705) && (vR1 || inR === 16705))) {
      i -= 1;
      break;
    }
    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL2 = wordLookup[inL];
    vR2 = wordLookup[inR];
    if (!((vL2 || inL === 16705) && (vR2 || inR === 16705))) {
      i -= 2;
      break;
    }
    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL3 = wordLookup[inL];
    vR3 = wordLookup[inR];
    if (!((vL3 || inL === 16705) && (vR3 || inR === 16705))) {
      i -= 3;
      break;
    }
    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL4 = wordLookup[inL];
    vR4 = wordLookup[inR];
    if (!((vL4 || inL === 16705) && (vR4 || inR === 16705))) {
      i -= 4;
      break;
    }
    outInts[j++] = vL1 >>> 4 | (vL1 & 15) << 12 | vR1 & 65280 | (vR1 & 255) << 16 | (vL2 & 4080) << 20;
    outInts[j++] = (vL2 & 15) << 4 | (vR2 & 65280) >>> 8 | (vR2 & 255) << 8 | (vL3 & 4080) << 12 | (vL3 & 15) << 28 | (vR3 & 65280) <<
    16;
    outInts[j++] = vR3 & 255 | (vL4 & 4080) << 4 | (vL4 & 15) << 20 | (vR4 & 3840) << 8 | vR4 << 24;
  }
  else while (i < fastIntsLen) {
    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL1 = wordLookup[inL];
    vR1 = wordLookup[inR];
    if (!((vL1 || inL === 16705) && (vR1 || inR === 16705))) {
      i -= 1;
      break;
    }
    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL2 = wordLookup[inL];
    vR2 = wordLookup[inR];
    if (!((vL2 || inL === 16705) && (vR2 || inR === 16705))) {
      i -= 2;
      break;
    }
    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL3 = wordLookup[inL];
    vR3 = wordLookup[inR];
    if (!((vL3 || inL === 16705) && (vR3 || inR === 16705))) {
      i -= 3;
      break;
    }
    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL4 = wordLookup[inL];
    vR4 = wordLookup[inR];
    if (!((vL4 || inL === 16705) && (vR4 || inR === 16705))) {
      i -= 4;
      break;
    }
    outInts[j++] = vL1 << 20 | vR1 << 8 | vL2 >>> 4;
    outInts[j++] = (vL2 & 15) << 28 | vR2 << 16 | vL3 << 4 | vR3 >>> 8;
    outInts[j++] = (vR3 & 255) << 24 | vL4 << 12 | vR4;
  }
  i <<= 2;
  j <<= 2;
  let i0 = i, ok = false;
  e: {
    if (lax) {
      f: while (i < strlen) {
        i0 = i;
        while ((vL1 = byteLookup[inBytes[i++]]) > 63) if (vL1 === 65) ok = true;
        while ((vL2 = byteLookup[inBytes[i++]]) > 63) if (vL2 === 65) ok = true;
        while ((vL3 = byteLookup[inBytes[i++]]) > 63) if (vL3 === 65) ok = true;
        while ((vL4 = byteLookup[inBytes[i++]]) > 63) if (vL4 === 65) ok = true;
        outBytes[j++] = vL1 << 2 | vL2 >>> 4;
        outBytes[j++] = (vL2 << 4 | vL3 >>> 2) & 255;
        outBytes[j++] = (vL3 << 6 | vL4) & 255;
        if (ok) break;
      }
    } else while (i < strlen) {
      i0 = i;
      while ((vL1 = byteLookup[inBytes[i++]]) > 63) if (vL1 === 66) break e;
      else if (vL1 === 65) ok = true;
      while ((vL2 = byteLookup[inBytes[i++]]) > 63) if (vL2 === 66) break e;
      else if (vL2 === 65) ok = true;
      while ((vL3 = byteLookup[inBytes[i++]]) > 63) if (vL3 === 66) break e;
      else if (vL3 === 65) ok = true;
      while ((vL4 = byteLookup[inBytes[i++]]) > 63) if (vL4 === 66) break e;
      else if (vL4 === 65) ok = true;
      outBytes[j++] = vL1 << 2 | vL2 >>> 4;
      outBytes[j++] = (vL2 << 4 | vL3 >>> 2) & 255;
      outBytes[j++] = (vL3 << 6 | vL4) & 255;
      if (ok) break;
    }
    ok = true;
  }
  if (!ok) throw new Error(`Invalid character in base64 at index ${i - 1}`);
  let validChars = 0;
  for (i = i0; i < strlen; i++) {
    const v = byteLookup[inBytes[i]];
    if (v < 64) validChars++;
    if (v === 65) break;
  }
  if (!lax) for (i = i0; i < strlen; i++) {
    const v = byteLookup[inBytes[i]];
    if (v > 65) throw new Error(`Invalid character in base64 after padding`);
  }
  const truncateBytes = { 4: 0, 3: 1, 2: 2, 1: 2, 0: 3 }[validChars];
  return outBytes.subarray(0, j - truncateBytes);
}
function fromBase64(s, options = {}) {
  return options.onInvalidInput !== "skip" && typeof Uint8Array.fromBase64 === "function" ? Uint8Array.fromBase64(s) : _fromBase64(
  s, options);
}
