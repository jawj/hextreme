import {
  littleEndian,
  b64ChStd as chStd,
  b64ChUrl as chUrl,
  b64ChPad as chPad,
  te,
  type Base64Options
} from './common';

export interface FromBase64Options {
  alphabet?: Base64Options['alphabet'] | 'base64any';
  onInvalidInput?: 'throw' | 'skip';
}

const
  // v00 = 16705,  // (65 << 8) | 65 -- signifies a zero out value: we now use this directly in the source below
  vzz = 31354;  // (122 << 8) | 122 -- (vZZ is smaller, so not relevant)

let
  stdWordLookup: Uint16Array,
  urlWordLookup: Uint16Array,
  anyWordLookup: Uint16Array,
  stdByteLookup: Uint8Array,
  urlByteLookup: Uint8Array,
  anyByteLookup: Uint8Array;

// there could in principle be any amount of whitespace between any two input characters, and 
// that makes it surprisingly tricky to decode base64 in chunks; for now, therefore, we don't try

export function _fromBase64(s: string, { alphabet, onInvalidInput }: FromBase64Options = {}) {
  const lax = onInvalidInput === 'skip';

  if (!stdWordLookup && alphabet !== 'base64url' && alphabet !== 'base64any') {
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

  if (!urlWordLookup && alphabet === 'base64url') {
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

  if (!anyWordLookup && alphabet === 'base64any') {
    anyWordLookup = new Uint16Array(vzz + 1);  // takes ~62KB of memory
    for (let l = 0; l < 64; l++) for (let r = 0; r < 64; r++) {
      const
        cl = chStd[l],
        cr = chStd[r],
        vin = littleEndian ? (cr << 8) | cl : cr | (cl << 8),
        vout = l << 6 | r;

      anyWordLookup[vin] = vout;

      if (l > 61 || r > 61) {
        const
          cl = chUrl[l],
          cr = chUrl[r],
          vin = littleEndian ? (cr << 8) | cl : cr | (cl << 8);

        anyWordLookup[vin] = vout;
      }
    }
  }

  if (!stdByteLookup) {
    stdByteLookup = new Uint8Array(256).fill(66);  // 66 means: invalid character
    urlByteLookup = new Uint8Array(256).fill(66);
    anyByteLookup = new Uint8Array(256).fill(66);

    stdByteLookup[chPad] = urlByteLookup[chPad] = anyByteLookup[chPad] = 65;  // 65 means: padding

    stdByteLookup[9] = stdByteLookup[10] = stdByteLookup[13] = stdByteLookup[32] =  // tab, \r, \n, space
      urlByteLookup[9] = urlByteLookup[10] = urlByteLookup[13] = urlByteLookup[32] =
      anyByteLookup[9] = anyByteLookup[10] = anyByteLookup[13] = anyByteLookup[32] = 64;  // 64 means: whitespace

    for (let i = 0; i < 64; i++) {
      const
        chStdI = chStd[i],
        chUrlI = chUrl[i];

      stdByteLookup[chStdI] = urlByteLookup[chUrlI] = anyByteLookup[chStdI] = anyByteLookup[chUrlI] = i;  // 6-bit values mean themselves
    }
  }

  const
    inBytes = te.encode(s),
    inBytesLen = inBytes.length,
    inIntsLen = inBytesLen >>> 2,  // divide by 4, round down: this is the number of complete uint32s we have
    inInts = new Uint32Array(inBytes.buffer, inBytes.byteOffset, inIntsLen),
    last3 = inIntsLen - 3,  // stop before this when consuming 4 bytes at a time
    maxOutBytesLen = inIntsLen * 3 + inBytesLen % 4,  // only get this if: no whitespace, no invalid characters, no padding
    outBytes = new Uint8Array(maxOutBytesLen),
    outInts = new Uint32Array(outBytes.buffer, 0, maxOutBytesLen >>> 2),
    wl = alphabet === 'base64url' ? urlWordLookup : alphabet === 'base64any' ? anyWordLookup : stdWordLookup,
    bl = alphabet === 'base64url' ? urlByteLookup : alphabet === 'base64any' ? anyByteLookup : stdByteLookup;

  // while we can, read 4x uint32 (16 bytes) + write 3x uint32 (12 bytes);
  // if we encounter anything that's not a valid base64 character -- even whitespace --
  // then we can no longer rely on 4-byte alignment, so we back up to the start of this 
  // iteration and bail out, probably letting the slow loop handle the rest

  let i = 0, j = 0, inInt, inL, inR, vL1, vR1, vL2, vR2, vL3, vR3, vL4, vR4;
  if (littleEndian) while (i < last3) {  // 
    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL1 = wl[inL];
    vR1 = wl[inR];
    if (!((vL1 || inL === 16705) && (vR1 || inR === 16705))) { i -= 1; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL2 = wl[inL];
    vR2 = wl[inR];
    if (!((vL2 || inL === 16705) && (vR2 || inR === 16705))) { i -= 2; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL3 = wl[inL];
    vR3 = wl[inR];
    if (!((vL3 || inL === 16705) && (vR3 || inR === 16705))) { i -= 3; break; }

    inInt = inInts[i++];
    inL = inInt & 65535;
    inR = inInt >>> 16;
    vL4 = wl[inL];
    vR4 = wl[inR];
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
  else while (i < last3) {
    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL1 = wl[inL];
    vR1 = wl[inR];
    if (!((vL1 || inL === 16705) && (vR1 || inR === 16705))) { i -= 1; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL2 = wl[inL];
    vR2 = wl[inR];
    if (!((vL2 || inL === 16705) && (vR2 || inR === 16705))) { i -= 2; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL3 = wl[inL];
    vR3 = wl[inR];
    if (!((vL3 || inL === 16705) && (vR3 || inR === 16705))) { i -= 3; break; }

    inInt = inInts[i++];
    inL = inInt >>> 16;
    inR = inInt & 65535;
    vL4 = wl[inL];
    vR4 = wl[inR];
    if (!((vL4 || inL === 16705) && (vR4 || inR === 16705))) { i -= 4; break; }

    outInts[j++] = vL1 << 20 | vR1 << 8 | vL2 >>> 4;  // this is so much nicer in big-endian ...
    outInts[j++] = (vL2 & 15) << 28 | vR2 << 16 | vL3 << 4 | vR3 >>> 8;
    outInts[j++] = (vR3 & 255) << 24 | vL4 << 12 | vR4;
  }

  i <<= 2;  // translate Uint32 addressing to Uint8 addressing
  j <<= 2;

  // if i === inBytesLen, it means we got a multiple of 4 input bytes with no
  // whitespace, no padding and no invalid characters -- and that means we're
  // done!

  if (i === inBytesLen) return outBytes;

  // this is the slow loop, which ideally only handles the last few bytes;
  // here we fall back to reading up to 4 VALID bytes, one at a time, and 
  // handling any errors (or simply ignoring them if we're in lax mode)

  let i0 = i, ok = false;
  e: {
    if (lax) while (i < inBytesLen) {
      i0 = i;
      while ((vL1 = bl[inBytes[i++]]) > 63) if (vL1 === 65) ok = true;  // skip past whitespace and invalid, break on =
      while ((vL2 = bl[inBytes[i++]]) > 63) if (vL2 === 65) ok = true;
      while ((vL3 = bl[inBytes[i++]]) > 63) if (vL3 === 65) ok = true;
      while ((vL4 = bl[inBytes[i++]]) > 63) if (vL4 === 65) ok = true;
      outBytes[j++] = vL1 << 2 | vL2 >>> 4;
      outBytes[j++] = (vL2 << 4 | vL3 >>> 2) & 255;
      outBytes[j++] = (vL3 << 6 | vL4) & 255;
      if (ok) break;
    }
    else while (i < inBytesLen) {
      i0 = i;
      while ((vL1 = bl[inBytes[i++]]) > 63) if (vL1 === 66) break e; else if (vL1 === 65) ok = true;  // skip past whitespace, break to error on invalid, break on =
      while ((vL2 = bl[inBytes[i++]]) > 63) if (vL2 === 66) break e; else if (vL2 === 65) ok = true;
      while ((vL3 = bl[inBytes[i++]]) > 63) if (vL3 === 66) break e; else if (vL3 === 65) ok = true;
      while ((vL4 = bl[inBytes[i++]]) > 63) if (vL4 === 66) break e; else if (vL4 === 65) ok = true;
      outBytes[j++] = vL1 << 2 | vL2 >>> 4;
      outBytes[j++] = (vL2 << 4 | vL3 >>> 2) & 255;
      outBytes[j++] = (vL3 << 6 | vL4) & 255;
      if (ok) break;
    }
    ok = true;
  }

  if (!ok) throw new Error(`Invalid character in base64 at index ${i - 1}`);

  // if input string included padding and/or whitespace, it will need truncating:
  // we need to count how many valid input characters (0 – 4) there are after i0

  let validChars = 0;
  for (i = i0; i < inBytesLen; i++) {
    const v = bl[inBytes[i]];
    if (v < 64) validChars++;
    if (v === 65) break;
  }
  if (!lax) for (i = i0; i < inBytesLen; i++) {
    const v = bl[inBytes[i]];
    if (v > 65) throw new Error(`Invalid character in base64 after padding`);
  }

  const truncateBytes = { 4: 0, 3: 1, 2: 2, 1: 3, 0: 3 }[validChars];
  return outBytes.subarray(0, j - truncateBytes!);
}

export function fromBase64(s: string, options: FromBase64Options = {}) {
  // @ts-expect-error TS doesn't know about fromHex
  if (typeof Uint8Array.fromBase64 === 'function' && options.onInvalidInput !== 'skip' && options.alphabet !== 'base64any') return Uint8Array.fromBase64(s, options) as Uint8Array;
  return _fromBase64(s, options);
}
