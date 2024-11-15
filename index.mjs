const
  hasTD = typeof TextDecoder === 'function',
  littleEndian = new Uint8Array((new Uint16Array([0x0102]).buffer))[0] === 0x02,
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

    const c = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102];  // 0123456789abcdef
    if (littleEndian) for (let i = 0; i < 256; i++) cc[i] = c[i & 0xF] << 8 | c[i >>> 4];
    else for (let i = 0; i < 256; i++) cc[i] = c[i & 0xF] | c[i >>> 4] << 8;
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

let te, hl, lo, hi;

export function fromHex(s, scratchArr) {
  if (!te) {
    const
      c = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102],  // 0123456789abcdef
      C = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70];     // 0123456789ABCDEF
      
    lo = (48 << 8) | 48;    // 00
    hi = (102 << 8) | 102;  // ff
    hl = new Uint8Array(hi + 1);
    te = new TextEncoder();

    if (littleEndian) for (let i = 0; i < 256; i++) {
      const 
        clo = c[i & 0xF] << 8,
        Clo = C[i & 0xF] << 8,
        chi = c[i >>> 4],
        Chi = C[i >>> 4];

      hl[(clo | chi)] =
        hl[(Clo | chi)] =
        hl[(clo | Chi)] =
        hl[(Clo | Chi)] = i;
    }
    else for (let i = 0; i < 256; i++) {
      const 
        clo = c[i & 0xF],
        Clo = C[i & 0xF],
        chi = c[i >>> 4] << 8,
        Chi = C[i >>> 4] << 8;

      hl[(clo | chi)] =
        hl[(Clo | chi)] =
        hl[(clo | Chi)] =
        hl[(Clo | Chi)] = i;
    }
  }

  const slen = s.length;
  if (slen & 1) throw new Error('Odd number of characters in hex string');

  const
    bytelen = slen >> 1,
    last7 = bytelen - 7,
    hex16 = scratchArr || new Uint16Array(bytelen + 3),  // + 3 is enough space for one 4-byte UTF-8 char, enabling us to detect that
    hex8 = new Uint8Array(hex16.buffer),
    out = new Uint8Array(bytelen),
    result = te.encodeInto(s, hex8);

  if (result.written > slen) throw new Error(`Multi-byte char in hex input`);

  let i = 0, ok = false, vin, vout;
  l1: {
    while (i < last7) {
      vin = hex16[i]; vout = hl[vin]; if (!vout && vin !== lo) break l1; out[i++] = vout;
      vin = hex16[i]; vout = hl[vin]; if (!vout && vin !== lo) break l1; out[i++] = vout;
      vin = hex16[i]; vout = hl[vin]; if (!vout && vin !== lo) break l1; out[i++] = vout;
      vin = hex16[i]; vout = hl[vin]; if (!vout && vin !== lo) break l1; out[i++] = vout;
      vin = hex16[i]; vout = hl[vin]; if (!vout && vin !== lo) break l1; out[i++] = vout;
      vin = hex16[i]; vout = hl[vin]; if (!vout && vin !== lo) break l1; out[i++] = vout;
      vin = hex16[i]; vout = hl[vin]; if (!vout && vin !== lo) break l1; out[i++] = vout;
      vin = hex16[i]; vout = hl[vin]; if (!vout && vin !== lo) break l1; out[i++] = vout;
    }
    while (i < bytelen) {
      vin = hex16[i]; vout = hl[vin]; if (!vout && vin !== lo) break l1; out[i++] = vout;
    }
    ok = true;
  }
  if (!ok) throw new Error(`Invalid hex input at index ${i << 1}`);
  return out;
}

