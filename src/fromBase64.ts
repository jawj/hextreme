import {
  littleEndian,
  b64ChStd as chStd,
  b64ChUrl as chUrl,
  b64ChPad as chPad,
  te,
  type Base64Options
} from './common';

export interface FromBase64Options extends Base64Options {
  onInvalidInput?: 'throw' | 'skip';
}

const
  vAA = 16705,  // (65 << 8) | 65 -- signifies a zero out value
  vzz = 31354;  // (122 << 8) | 122 -- (vZZ is smaller, so not relevant)

let
  stdWordLookup: Uint16Array,
  urlWordLookup: Uint16Array,
  stdByteLookup: Uint8Array,
  urlByteLookup: Uint8Array;

// there could in principle be any amount of whitespace between any two input characters, and 
// that makes it surprisingly tricky to decode base64 in chunks; for now, therefore, we don't try

export function _fromBase64(s: string, { alphabet, onInvalidInput }: FromBase64Options = {}) {
  const
    lax = onInvalidInput === 'skip',
    urlsafe = alphabet === 'base64url';

  if (!urlsafe && !stdWordLookup) {
    stdWordLookup = new Uint16Array(vzz + 1);  // takes ~62KB of memory
    for (let l = 0; l < 64; l++) for (let r = 0; r < 64; r++) {
      const
        cl = chStd[l],
        cr = chStd[r],
        vin = littleEndian ? (cr << 8) | cl : cr | (cl << 8),
        vout = l << 6 | r;

      stdWordLookup[vin] = vout;
    }
  }

  if (urlsafe && !urlWordLookup) {
    urlWordLookup = new Uint16Array(vzz + 1);  // takes ~62KB of memory
    for (let l = 0; l < 64; l++) for (let r = 0; r < 64; r++) {
      const
        cl = chUrl[l],
        cr = chUrl[r],
        vin = littleEndian ? (cr << 8) | cl : cr | (cl << 8),
        vout = l << 6 | r;

      urlWordLookup[vin] = vout;
    }
  }

  if (!stdByteLookup) {
    stdByteLookup = new Uint8Array(256).fill(128);  // 128 means: invalid character
    stdByteLookup[chPad] = stdByteLookup[9] = stdByteLookup[10] = stdByteLookup[13] = stdByteLookup[32] = 64;  // 64 means: whitespace or padding
    urlByteLookup = new Uint8Array(256).fill(128);
    urlByteLookup[chPad] = urlByteLookup[9] = urlByteLookup[10] = urlByteLookup[13] = urlByteLookup[32] = 64;
    for (let i = 0; i < 64; i++) stdByteLookup[chStd[i]] = urlByteLookup[chUrl[i]] = i;  // 6-bit values mean themselves
  }

  const
    strlen = s.length,
    inIntsLen = Math.ceil(strlen / 4),
    inIntsLenPlus = inIntsLen + 1,  // `+ 1` allows an extra 4 bytes: enough space for a 4-byte UTF-8 char to be encoded even at the end, so we can detect any multi-byte char
    fastIntsLen = inIntsLen - 4,  // 4 bytes per Uint32, and we want to work in groups of 4, plus avoid the last 2 bytes (which may be padding)
    inInts = new Uint32Array(inIntsLenPlus),
    inBytes = new Uint8Array(inInts.buffer, 0, strlen),  // view onto same memory
    maxOutBytesLen = inIntsLen * 3,
    outBytes = new Uint8Array(maxOutBytesLen),
    outInts = new Uint32Array(outBytes.buffer, 0, outBytes.length >>> 2),
    wordLookup = urlsafe ? urlWordLookup : stdWordLookup,
    byteLookup = urlsafe ? urlByteLookup : stdByteLookup;

  // we don't need to explicitly check for multibyte characters (via `result.written > strlen`)
  // because any multi-byte character includes bytes that are outside the valid range
  
  te.encodeInto(s, inBytes);

  // while we can, read 4x uint32 (16 bytes) + write 3x uint32 (12 bytes);
  // if we encounter anything that's not a valid base64 character -- even whitespace --
  // we back up to the start of the iteration and bail out, letting the slow loop handle the rest

  let i = 0, j = 0, inInt, inL, inR, vL1, vR1, vL2, vR2, vL3, vR3, vL4, vR4;
  if (littleEndian) while (i < fastIntsLen) {  // 
    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL1 = wordLookup[inL];
    vR1 = wordLookup[inR];
    if (!((vL1 || inL === vAA) && (vR1 || inR === vAA))) { i -= 1; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL2 = wordLookup[inL];
    vR2 = wordLookup[inR];
    if (!((vL2 || inL === vAA) && (vR2 || inR === vAA))) { i -= 2; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL3 = wordLookup[inL];
    vR3 = wordLookup[inR];
    if (!((vL3 || inL === vAA) && (vR3 || inR === vAA))) { i -= 3; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL4 = wordLookup[inL];
    vR4 = wordLookup[inR];
    if (!((vL4 || inL === vAA) && (vR4 || inR === vAA))) { i -= 4; break; }

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
    inR = inInt & 65535;
    vL1 = wordLookup[inL];
    vR1 = wordLookup[inR];
    if (!((vL1 || inL === vAA) && (vR1 || inR === vAA))) { i -= 1; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL2 = wordLookup[inL];
    vR2 = wordLookup[inR];
    if (!((vL2 || inL === vAA) && (vR2 || inR === vAA))) { i -= 2; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL3 = wordLookup[inL];
    vR3 = wordLookup[inR];
    if (!((vL3 || inL === vAA) && (vR3 || inR === vAA))) { i -= 3; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL4 = wordLookup[inL];
    vR4 = wordLookup[inR];
    if (!((vL4 || inL === vAA) && (vR4 || inR === vAA))) { i -= 4; break; }

    outInts[j++] = vL1 << 20 | vR1 << 8 | vL2 >>> 4;  // this is so much nicer in big-endian ...
    outInts[j++] = (vL2 & 15) << 28 | vR2 << 16 | vL3 << 4 | vR3 >>> 8;
    outInts[j++] = (vR3 & 255) << 24 | vL4 << 12 | vR4;
  }

  i <<= 2;  // translate Uint32 addressing to Uint8 addressing
  j <<= 2;

  // this is the slow loop, which in normal cases should only handle the last few bytes;
  // here we fall back to reading up to 4 bytes, one at a time, and handling any errors
  // (or simply ignoring them if we're in lax mode)

  let i0 = i, ok = false, v1, v2, v3, v4;
  e: {
    if (lax) while (i < strlen) {
      i0 = i;
      while ((v1 = byteLookup[inBytes[i++]]) > 63);  // skip past whitespace and invalid
      while ((v2 = byteLookup[inBytes[i++]]) > 63);
      while ((v3 = byteLookup[inBytes[i++]]) > 63);
      while ((v4 = byteLookup[inBytes[i++]]) > 63);
      outBytes[j++] = v1 << 2 | v2 >>> 4;
      outBytes[j++] = (v2 << 4 | v3 >>> 2) & 255;
      outBytes[j++] = (v3 << 6 | v4) & 255;
    }
    else while (i < strlen) {
      i0 = i;
      while ((v1 = byteLookup[inBytes[i++]]) > 63) if (v1 === 128) break e;  // skip past whitespace, break on invalid
      while ((v2 = byteLookup[inBytes[i++]]) > 63) if (v2 === 128) break e;
      while ((v3 = byteLookup[inBytes[i++]]) > 63) if (v3 === 128) break e;
      while ((v4 = byteLookup[inBytes[i++]]) > 63) if (v4 === 128) break e;
      outBytes[j++] = v1 << 2 | v2 >>> 4;
      outBytes[j++] = (v2 << 4 | v3 >>> 2) & 255;
      outBytes[j++] = (v3 << 6 | v4) & 255;
    }
    ok = true;
  }

  if (!ok) throw new Error(`Invalid character in base64 at index ${i - 1}`);

  // if input string included padding and/or whitespace, it will need truncating:
  // we need to count how many valid input characters (0 – 4) there are after i0

  let validChars = 0;
  for (let i = i0; i < strlen; i++) if (byteLookup[inBytes[i]] < 64) validChars++;
  const truncateBytes = { 4: 0, 3: 1, 2: 2, 1: 2, 0: 3 }[validChars];

  return outBytes.subarray(0, j - truncateBytes!);
}

export function fromBase64(s: string, options: FromBase64Options = {}) {
  // @ts-expect-error TS doesn't know about fromHex
  return (options.onInvalidInput !== 'skip' && typeof Uint8Array.fromBase64 === 'function') ? Uint8Array.fromBase64(s) : _fromBase64(s, options);
}
