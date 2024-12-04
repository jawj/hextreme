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
  // v00 = 16705,  // (65 << 8) | 65 -- signifies a zero out value: we now use this directly in the source below
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
  // then we can no longer rely on 4-byte alignment, so we back up to the start of this 
  // iteration and bail out, letting the slow loop handle the rest

  let i = 0, j = 0, inInt, inL, inR, vL1, vR1, vL2, vR2, vL3, vR3, vL4, vR4;
  if (littleEndian) while (i < fastIntsLen) {  // 
    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL1 = wordLookup[inL];
    vR1 = wordLookup[inR];
    if (!((vL1 || inL === 16705) && (vR1 || inR === 16705))) { i -= 1; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL2 = wordLookup[inL];
    vR2 = wordLookup[inR];
    if (!((vL2 || inL === 16705) && (vR2 || inR === 16705))) { i -= 2; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL3 = wordLookup[inL];
    vR3 = wordLookup[inR];
    if (!((vL3 || inL === 16705) && (vR3 || inR === 16705))) { i -= 3; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL4 = wordLookup[inL];
    vR4 = wordLookup[inR];
    if (!((vL4 || inL === 16705) && (vR4 || inR === 16705))) { i -= 4; break; }

    outInts[j++] =
      vL1 >>> 4 | (vL1 & 15) << 12 |
      vR1 & 65280 | (vR1 & 255) << 16 |
      (vL2 & 4080) << 20;

    outInts[j++] =
      (vL2 & 15) << 4 |
      (vR2 & 65280) >>> 8 | (vR2 & 255) << 8 |
      (vL3 & 4080) << 12 | (vL3 & 15) << 28 |
      (vR3 & 65280) << 16;

    outInts[j++] =
      vR3 & 255 |
      (vL4 & 4080) << 4 | (vL4 & 15) << 20 |
      (vR4 & 3840) << 8 | vR4 << 24;
  }
  else while (i < fastIntsLen) {
    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL1 = wordLookup[inL];
    vR1 = wordLookup[inR];
    if (!((vL1 || inL === 16705) && (vR1 || inR === 16705))) { i -= 1; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL2 = wordLookup[inL];
    vR2 = wordLookup[inR];
    if (!((vL2 || inL === 16705) && (vR2 || inR === 16705))) { i -= 2; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL3 = wordLookup[inL];
    vR3 = wordLookup[inR];
    if (!((vL3 || inL === 16705) && (vR3 || inR === 16705))) { i -= 3; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL4 = wordLookup[inL];
    vR4 = wordLookup[inR];
    if (!((vL4 || inL === 16705) && (vR4 || inR === 16705))) { i -= 4; break; }

    outInts[j++] = vL1 << 20 | vR1 << 8 | vL2 >>> 4;  // this is so much nicer in big-endian ...
    outInts[j++] = (vL2 & 15) << 28 | vR2 << 16 | vL3 << 4 | vR3 >>> 8;
    outInts[j++] = (vR3 & 255) << 24 | vL4 << 12 | vR4;
  }

  i <<= 2;  // translate Uint32 addressing to Uint8 addressing
  j <<= 2;

  // this is the slow loop, which in normal cases should only handle the last few bytes;
  // here we fall back to reading up to 4 bytes, one at a time, and handling any errors
  // (or simply ignoring them if we're in lax mode)

  let i0 = i, ok = false;
  e: {
    if (lax) while (i < strlen) {
      i0 = i;
      while ((vL1 = byteLookup[inBytes[i++]]) > 63);  // skip past whitespace and invalid
      while ((vL2 = byteLookup[inBytes[i++]]) > 63);
      while ((vL3 = byteLookup[inBytes[i++]]) > 63);
      while ((vL4 = byteLookup[inBytes[i++]]) > 63);
      outBytes[j++] = vL1 << 2 | vL2 >>> 4;
      outBytes[j++] = (vL2 << 4 | vL3 >>> 2) & 255;
      outBytes[j++] = (vL3 << 6 | vL4) & 255;
    }
    else while (i < strlen) {
      i0 = i;
      while ((vL1 = byteLookup[inBytes[i++]]) > 63) if (vL1 === 128) break e;  // skip past whitespace, break on invalid
      while ((vL2 = byteLookup[inBytes[i++]]) > 63) if (vL2 === 128) break e;
      while ((vL3 = byteLookup[inBytes[i++]]) > 63) if (vL3 === 128) break e;
      while ((vL4 = byteLookup[inBytes[i++]]) > 63) if (vL4 === 128) break e;
      outBytes[j++] = vL1 << 2 | vL2 >>> 4;
      outBytes[j++] = (vL2 << 4 | vL3 >>> 2) & 255;
      outBytes[j++] = (vL3 << 6 | vL4) & 255;
    }
    ok = true;
  }

  if (!ok) throw new Error(`Invalid character in base64 at index ${i - 1}`);

  // if input string included padding and/or whitespace, it will need truncating:
  // we need to count how many valid input characters (0 – 4) there are after i0

  let validChars = 0;
  for (i = i0; i < strlen; i++) if (byteLookup[inBytes[i]] < 64) validChars++;
  const truncateBytes = { 4: 0, 3: 1, 2: 2, 1: 2, 0: 3 }[validChars];

  return outBytes.subarray(0, j - truncateBytes!);
}

export function fromBase64(s: string, options: FromBase64Options = {}) {
  // @ts-expect-error TS doesn't know about fromHex
  return (options.onInvalidInput !== 'skip' && typeof Uint8Array.fromBase64 === 'function') ? Uint8Array.fromBase64(s) : _fromBase64(s, options);
}
