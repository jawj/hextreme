const
  hasTD = typeof TextDecoder === 'function',
  littleEndian = new Uint8Array((new Uint16Array([0x0102]).buffer))[0] === 0x02,
  chunkSize = 524288;  // temporary buffer allocation size is never more than 2x this value, in bytes

// hex

let hp, tdh, cc;

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

  while (i < last7) {  // a bit of loop unrolling helps performance in V8 specifically
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
  if (!tdh) {
    tdh = new TextDecoder();
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

  const hex = tdh.decode(a.subarray(0, len));
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

let te, hl, v00, vff;

export function _fromHexUsingTextEncoder(s, outArr, scratchArr) {
  // note: using a Map or a big switch/case block are both an order of magnitude slower than these TypedArray lookups

  if (!te) {  // one-time prep
    v00 = (48 << 8) | 48;
    vff = (102 << 8) | 102;  // vFF is smaller, so not relevant
    hl = new Uint8Array(vff + 1);  // hex lookup -- takes 26KB of memory (could halve that by doing vff - v00 + 1, but that's slower)
    te = new TextEncoder();

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
  if (slen & 1) throw new Error('Hex input is an odd number of characters');

  const
    bytelen = slen >> 1,
    last7 = bytelen - 7,
    h16len = bytelen + 2,
    h16 = scratchArr || new Uint16Array(h16len),  // + 2 gives 4 bytes: enough space for one 4-byte UTF-8 char, enabling us to detect multi-byte chars
    h8 = new Uint8Array(h16.buffer),  // view onto same memory
    out = outArr || new Uint8Array(bytelen);

  if (h16.length < h16len) throw new Error(`Wrong-sized scratch array supplied (was ${h16.length}, expected at least ${h16len})`);
  if (out.length != bytelen) throw new Error(`Wrong-sized output array supplied (was ${out.length}, expected ${bytelen})`);

  const result = te.encodeInto(s, h8);
  if (result.written > slen) throw new Error('Hex input contains multi-byte characters');

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

  if (!ok) throw new Error(`Invalid pair in hex input at index ${i << 1}`);
  return out;
}

export function _fromHexInChunksUsingTextEncoder(s) {
  const slen = s.length;
  // needs checking here because it will be rounded down to a multiple of two below
  if (slen & 1) throw new Error('Hex input is an odd number of characters');

  const
    bytelen = slen >> 1,
    chunks = Math.ceil(bytelen / chunkSize),
    scratchArr = new Uint16Array((chunks > 1 ? chunkSize : bytelen) + 2),
    outArr = new Uint8Array(bytelen);

  for (let i = 0; i < chunks; i++) {
    const
      chunkStartByte = i * chunkSize,
      chunkEndByte = chunkStartByte + chunkSize;

    _fromHexUsingTextEncoder(
      s.slice(chunkStartByte << 1, chunkEndByte << 1),
      outArr.subarray(chunkStartByte, chunkEndByte),
      scratchArr,
    );
  }

  return outArr;
}

export function fromHex(s) {
  return (
    typeof Uint8Array.fromHex === 'function' ? Uint8Array.fromHex(s) :
      _fromHexInChunksUsingTextEncoder(s));
}

// base64

const
  b64StdChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  b64UrlChars = '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^-_',  // only the last two are used
  padChar = '='.charCodeAt(0),
  padChar3 = padChar << (littleEndian ? 16 : 8),
  padChar4 = padChar << (littleEndian ? 24 : 0);

let tdb, stdCh1, stdCh2, stdCh3, stdCh4, urlCh1, urlCh2, urlCh3, urlCh4;

export function toBase64(d, pad, urlsafe) {
  if (!tdb) {  // one-time prep
    tdb = new TextDecoder();

    stdCh1 = new Uint32Array(256);
    stdCh2 = new Uint32Array(64);
    stdCh3 = new Uint32Array(64);
    stdCh4 = new Uint32Array(256);

    for (let i = 0; i < 64; i++) {
      const
        stdChar = b64StdChars.charCodeAt(i),
        i4 = i << 2;

      stdCh1[i4] = stdCh1[i4 | 1] = stdCh1[i4 | 2] = stdCh1[i4 | 3] = stdChar << (littleEndian ? 0 : 24);
      stdCh2[i] = stdChar << (littleEndian ? 8 : 16);
      stdCh3[i] = stdChar << (littleEndian ? 16 : 8);
      stdCh4[i] = stdCh4[i | 64] = stdCh4[i | 128] = stdCh4[i | 192] = stdChar << (littleEndian ? 24 : 0);
    }

    urlCh1 = stdCh1.slice();
    urlCh2 = stdCh2.slice();
    urlCh3 = stdCh3.slice();
    urlCh4 = stdCh4.slice();

    for (let i = 62; i < 64; i++) {
      const
        urlChar = b64UrlChars.charCodeAt(i),
        i4 = i << 2;

      urlCh1[i4] = urlCh1[i4 | 1] = urlCh1[i4 | 2] = urlCh1[i4 | 3] = urlChar << (littleEndian ? 0 : 24);
      urlCh2[i] = urlChar << (littleEndian ? 8 : 16);
      urlCh3[i] = urlChar << (littleEndian ? 16 : 8);
      urlCh4[i] = urlCh4[i | 64] = urlCh4[i | 128] = urlCh4[i | 192] = urlChar << (littleEndian ? 24 : 0);
    }
  }

  const
    [ch1, ch2, ch3, ch4] = urlsafe ? [urlCh1, urlCh2, urlCh3, urlCh4] : [stdCh1, stdCh2, stdCh3, stdCh4],
    inlen = d.length,
    last2 = inlen - 2,
    outints = Math.ceil(inlen / 3),
    out = new Uint32Array(outints);

  let i = 0, j = 0;

  while (i < last2) {
    const
      b1 = d[i++],
      b2 = d[i++],
      b3 = d[i++];

    out[j++] =
      ch1[b1] |
      ch2[(b1 & 3) << 4 | b2 >> 4] |
      ch3[(b2 & 15) << 2 | b3 >> 6] |
      ch4[b3];
  }

  // if input length was a multiple of 3, we're done
  if (i === inlen) return tdb.decode(out);

  // instead, deal with trailing 1 or 2 bytes
  const 
    b1 = d[i++],  // b1 is always defined
    b2 = d[i++];  // b2 could be undefined
    
  out[j++] =
    ch1[b1] |
    ch2[(b1 & 3) << 4 | (b2 || 0) >> 4] |
    (b2 === undefined ? padChar3 : ch3[(b2 & 15) << 2]) |
    padChar4;

  // if we're padding, we're done
  if (pad) return tdb.decode(out);

  // instead, truncate output by interpreting array as Uint8Array
  let out8 = new Uint8Array(out.buffer, 0, (outints << 2) - (b2 === undefined ? 2 : 1));
  return tdb.decode(out8);
}
