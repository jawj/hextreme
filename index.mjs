const
  hasTD = typeof TextDecoder === 'function',
  chunkSize = 524288;  // temporary buffer allocation size is 2x this value in bytes

let hp, td, cc;

export function _toHexUsingStringConcat(d) {
  if (!hp) {
    hp = new Array(256);
    for (let i = 0; i < 256; i++) hp[i] = (i < 16 ? '0' : '') + i.toString(16);
  }

  const
    len = d.length,
    last7 = len - 7;

  let
    out = '',
    i = 0;

  while (i < last7) {
    out += hp[d[i++]];
    out += hp[d[i++]];
    out += hp[d[i++]];
    out += hp[d[i++]]; // 4
    out += hp[d[i++]];
    out += hp[d[i++]];
    out += hp[d[i++]];
    out += hp[d[i++]]; // 8
  }
  while (i < len) {
    out += hp[d[i++]];
  }

  return out;
}

export function _toHexUsingTextDecoder(d, scratchArr) {
  if (!td) {
    td = new TextDecoder();
    cc = new Uint16Array(256);

    const
      c = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102],  // 0123456789abcdef
      littleEndian = new Uint8Array((new Uint16Array([0x0102]).buffer))[0] === 0x02;

    if (littleEndian) for (let i = 0; i < 256; i++) cc[i] = c[i & 0xF] << 8 | c[(i >>> 4) & 0xF];
    else for (let i = 0; i < 256; i++) cc[i] = c[i & 0xF] | c[(i >>> 4) & 0xF] << 8;
  }

  const
    len = d.length,
    last7 = len - 7,
    a = scratchArr || new Uint16Array(len);

  let i = 0;

  while (i < last7) {
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

export function _toHexInChunksUsingTextDecoder(d) {
  let
    hex = '',
    len = d.length,
    chunks = Math.ceil(len / chunkSize),
    scratchArr = new Uint16Array(chunks > 1 ? chunkSize : len);

  for (let i = 0; i < chunks; i++) {
    const
      start = i * chunkSize,
      end = start + chunkSize;  // subarray has no problem going past the end of the array

    hex += _toHexUsingTextDecoder(d.subarray(start, end), scratchArr);
  }

  return hex;
}

export function toHex(d) {
  return (
    typeof d.toHex === 'function' ? d.toHex() :
      hasTD === true ? _toHexInChunksUsingTextDecoder(d) :
        _toHexUsingStringConcat(d));
}
