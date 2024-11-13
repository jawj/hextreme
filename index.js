var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var stdin_exports = {};
__export(stdin_exports, {
  _toHexInChunksUsingTextDecoder: () => _toHexInChunksUsingTextDecoder,
  _toHexUsingStringConcat: () => _toHexUsingStringConcat,
  _toHexUsingTextDecoder: () => _toHexUsingTextDecoder,
  toHex: () => toHex
});
module.exports = __toCommonJS(stdin_exports);
const hasTD = typeof TextDecoder === "function", chunkSize = 524288;
let hp, td, cc;
function _toHexUsingStringConcat(d) {
  if (!hp) {
    hp = new Array(256);
    for (let i2 = 0; i2 < 256; i2++) hp[i2] = (i2 < 16 ? "0" : "") + i2.toString(16);
  }
  const len = d.length, last7 = len - 7;
  let out = "", i = 0;
  while (i < last7) {
    out += hp[d[i++]];
    out += hp[d[i++]];
    out += hp[d[i++]];
    out += hp[d[i++]];
    out += hp[d[i++]];
    out += hp[d[i++]];
    out += hp[d[i++]];
    out += hp[d[i++]];
  }
  while (i < len) {
    out += hp[d[i++]];
  }
  return out;
}
function _toHexUsingTextDecoder(d, scratchArr) {
  if (!td) {
    td = new TextDecoder();
    cc = new Uint16Array(256);
    const c = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102], littleEndian = new Uint8Array(new Uint16Array([258]).buffer)[0] === 2;
    if (littleEndian) for (let i2 = 0; i2 < 256; i2++) cc[i2] = c[i2 & 15] << 8 | c[i2 >>> 4 & 15];
    else for (let i2 = 0; i2 < 256; i2++) cc[i2] = c[i2 & 15] | c[i2 >>> 4 & 15] << 8;
  }
  const len = d.length, last7 = len - 7, a = scratchArr || new Uint16Array(len);
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
  const hex = td.decode(a.subarray(0, len));
  return hex;
}
function _toHexInChunksUsingTextDecoder(d) {
  let hex = "", len = d.length, chunks = Math.ceil(len / chunkSize), scratchArr = new Uint16Array(chunks > 1 ? chunkSize : len);
  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize, end = start + chunkSize;
    hex += _toHexUsingTextDecoder(d.subarray(start, end), scratchArr);
  }
  return hex;
}
function toHex(d) {
  return typeof d.toHex === "function" ? d.toHex() : hasTD === true ? _toHexInChunksUsingTextDecoder(d) : _toHexUsingStringConcat(d);
}
