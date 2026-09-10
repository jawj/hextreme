import {
  toHex,
  _toHex,
  _toHexChunked,
  fromHex,
  _fromHex,
  _fromHexChunked,
  toBase64,
  _toBase64,
  _toBase64Chunked,
  fromBase64,
  _fromBase64,
} from './src/index.ts';

function arrEq(arr1: Uint8Array, arr2: Uint8Array) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0, len = arr1.length; i < len; i++) if (arr1[i] !== arr2[i]) return false;
  return true;
}

function assertArrEq(arr1: Uint8Array, arr2: Uint8Array, context = 'no context') {
  if (!arrEq(arr1, arr2)) {
    const ext1 = arr1.length < 100 ? arr1.join() : arr1.slice(0, 50).join() + ' ... ' + arr1.slice(-50).join();
    const ext2 = arr2.length < 100 ? arr2.join() : arr2.slice(0, 50).join() + ' ... ' + arr2.slice(-50).join();
    throw new Error(`Array mismatch: lengths ${arr1.length} and ${arr2.length}, ${ext1} != ${ext2} (${context})`);
  }
}

function assertStrEq(str1: string, str2: string) {
  if (str1 === str2) return;
  const commonLength = Math.min(str1.length, str2.length);
  let i;
  for (i = 0; i < commonLength; i++) if (str1.charAt(i) !== str2.charAt(i)) break;
  const ext1 = str1.length < 200 ? str1 : str1.slice(0, 100) + ' ... ' + str1.slice(-100);
  const ext2 = str2.length < 200 ? str2 : str2.slice(0, 100) + ' ... ' + str2.slice(-100);
  throw new Error(`String mismatch: lengths ${str1.length} and ${str2.length}, first difference at index ${i}, '${ext1}' != '${ext2}'`);
}

function assertThrows(fn: () => unknown, messageIncludes?: string) {
  let err: unknown = null;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error('Expected function to throw');
  if (messageIncludes && !String(err).includes(messageIncludes)) {
    throw new Error(`Expected error to include ${JSON.stringify(messageIncludes)}, got ${err}`);
  }
}

console.log('Generating random test data ...');

const
  lengths = [...new Array(102).fill(0).map((_, i) => i), 1010, 10101, 101010, 1010104, 33554433],
  arrays = lengths.map(length => {
    const offset = length % 12;
    const arr = new Uint8Array(length + offset).subarray(offset);
    for (let i = 0; i < length; i++) arr[i] = Math.random() * 256 >> 0;
    return arr;
  }),
  benchmarkArray = arrays[arrays.length - 1],
  benchmarkBuffer = Buffer.from(benchmarkArray),
  benchmarkHex = benchmarkBuffer.toString('hex'),
  benchmarkBase64Std = benchmarkBuffer.toString('base64');

console.log('Generated\n');


console.log('Testing public API functions ...');

const publicApiData = new Uint8Array([0, 1, 2, 15, 16, 127, 128, 254, 255]);
assertStrEq(toHex(publicApiData), _toHexChunked(publicApiData));
assertStrEq(toHex(publicApiData, { alphabet: 'upper' }), _toHexChunked(publicApiData, { alphabet: 'upper' }));
assertArrEq(fromHex('0001020f107f80FEff'), publicApiData);
assertArrEq(fromHex('0001020f107f80FEff', { onInvalidInput: 'truncate' }), publicApiData);
assertStrEq(toBase64(publicApiData), _toBase64Chunked(publicApiData));
assertStrEq(toBase64(publicApiData, { omitPadding: true }), _toBase64Chunked(publicApiData, { omitPadding: true }));
assertStrEq(toBase64(publicApiData, { alphabet: 'base64url' }), _toBase64Chunked(publicApiData, { alphabet: 'base64url' }));
assertArrEq(fromBase64(_toBase64Chunked(publicApiData)), publicApiData);
assertArrEq(fromBase64(_toBase64Chunked(publicApiData), { onInvalidInput: 'skip' }), publicApiData);
assertArrEq(fromBase64(_toBase64Chunked(publicApiData, { alphabet: 'base64url' }), { alphabet: 'base64url' }), publicApiData);
assertArrEq(fromBase64('_w==', { alphabet: 'base64any' }), new Uint8Array([255]));
assertThrows(() => fromHex('0'));
assertThrows(() => fromBase64('A'));

console.log('Tests passed\n');


console.log('Testing hexadecimal alphabets and supplied arrays ...');

const allBytes = new Uint8Array(256);
for (let i = 0; i < allBytes.length; i++) allBytes[i] = i;
const allBytesHex = Buffer.from(allBytes).toString('hex');
assertStrEq(_toHex(allBytes), allBytesHex);
assertStrEq(_toHex(allBytes, { alphabet: 'upper' }), allBytesHex.toUpperCase());
assertArrEq(_fromHex('aAbBcCdDeEfF00123456789fFf'), Buffer.from('aabbccddeeff00123456789fff', 'hex'));

const suppliedOut = new Uint8Array(4);
const suppliedResult = _fromHexChunked('deadBEEF', { outArray: suppliedOut });
if (suppliedResult !== suppliedOut) throw new Error('fromHex did not return the supplied output array');
assertArrEq(suppliedOut, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));

const suppliedTruncatedOut = new Uint8Array(4);
const suppliedTruncatedResult = _fromHexChunked('deadXXff', {
  onInvalidInput: 'truncate',
  outArray: suppliedTruncatedOut
});
if (suppliedTruncatedResult.buffer !== suppliedTruncatedOut.buffer) {
  throw new Error('Truncated fromHex result does not share the supplied output array');
}
assertArrEq(suppliedTruncatedResult, new Uint8Array([0xde, 0xad]));

assertThrows(() => _fromHexChunked('deadbeef', { outArray: new Uint8Array(3) }), 'expected 4');
assertThrows(() => _fromHex('deadbeef', { scratchArray: new Uint16Array(5) }), 'expected at least 6');
assertThrows(() => _fromHex('deadbeef', { outArray: new Uint8Array(3) }), 'expected 4');
assertArrEq(_fromHex('deadbeef', {
  scratchArray: new Uint16Array(6),
  outArray: new Uint8Array(4)
}), new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
assertStrEq(_toHex(publicApiData, { scratchArr: new Uint16Array(publicApiData.length) }), '0001020f107f80feff');
assertStrEq(_toBase64(publicApiData, {
  scratchArr: new Uint32Array(Math.ceil(publicApiData.length / 3))
}), Buffer.from(publicApiData).toString('base64'));

console.log('Tests passed\n');


console.log('Testing base64 output options and alphabets ...');

for (const data of arrays.slice(0, 8)) {
  const standard = Buffer.from(data).toString('base64');
  const url = Buffer.from(data).toString('base64url');
  assertStrEq(_toBase64Chunked(data, { omitPadding: true }), standard.replace(/=+$/, ''));
  assertStrEq(_toBase64Chunked(data, { alphabet: 'base64url' }), url + '='.repeat((4 - url.length % 4) % 4));
}

const mixedAlphabet = '/_+_';
const mixedAlphabetExpected = _fromBase64('//+/', { alphabet: 'base64' });
assertArrEq(_fromBase64(mixedAlphabet, { alphabet: 'base64any' }), mixedAlphabetExpected);
assertThrows(() => _fromBase64('ab-c', { alphabet: 'base64' }));
assertThrows(() => _fromBase64('ab+c', { alphabet: 'base64url' }));
assertThrows(() => _fromBase64(mixedAlphabet, { alphabet: 'base64' }));
assertThrows(() => _fromBase64(mixedAlphabet, { alphabet: 'base64url' }));

console.log('Tests passed\n');


console.log('Encoding as base64 ...');

const
  rNodeBufferB64Std = arrays.map(arr => Buffer.from(arr).toString('base64')),
  rToBase64Std = arrays.map(arr => _toBase64Chunked(arr));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (rNodeBufferB64Std[i] !== rToBase64Std[i]) {
    throw new Error(`base64 mismatch for array length ${lengths[i]}:
  toString('base64'): '${rNodeBufferB64Std[i]}' (${rNodeBufferB64Std[i].length})
  _toBase64Chunked: '${rToBase64Std[i]}' (${rToBase64Std[i].length})`);
  }
}

console.log('Tests passed\n');


console.log('Decoding back from base64 and checking results ...');

for (let i = 0; i < arrays.length; i++) {
  const
    data = arrays[i],
    base64 = rNodeBufferB64Std[i] + '\n'.repeat(i % 5),
    dataAgain = _fromBase64(base64),
    dataAgain2 = _fromBase64(base64, { alphabet: 'base64any' });

  assertArrEq(data, dataAgain);
  assertArrEq(data, dataAgain2);
}

console.log('Tests passed\n');


console.log('Encoding as base64url ...');

const
  rNodeBufferB64Url = arrays.map(arr => Buffer.from(arr).toString('base64url')),
  rToBase64Url = arrays.map(arr => _toBase64Chunked(arr, { alphabet: 'base64url', omitPadding: true }));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (rNodeBufferB64Url[i] !== rToBase64Url[i]) throw new Error(`Mismatch: ${rNodeBufferB64Url[i]} != ${rToBase64Url[i]}`);
}

console.log('Tests passed\n');


console.log('Decoding back from base64url and checking results ...');

for (let i = 0; i < arrays.length; i++) {
  const
    data = arrays[i],
    base64 = ' '.repeat(i % 2) + rNodeBufferB64Url[i] + '\n'.repeat(i % 5),
    dataAgain = _fromBase64(base64, { alphabet: 'base64url' }),
    dataAgain2 = _fromBase64(base64, { alphabet: 'base64any' });

  assertArrEq(data, dataAgain);
  assertArrEq(data, dataAgain2);
}

console.log('Tests passed\n');


console.log('Decoding base64 with unusual whitespace or padding ...');

const spaced = benchmarkBase64Std.split('').join(' ');
console.log('s p a c e d   o u t');
assertArrEq(_fromBase64(spaced), Buffer.from(spaced, 'base64'));
assertArrEq(_fromBase64(spaced, { onInvalidInput: 'skip' }), Buffer.from(spaced, 'base64'));

const spaceFirst = '\n'.repeat(12345678) + benchmarkBase64Std;
console.log('     lots of space first');
assertArrEq(_fromBase64(spaceFirst), Buffer.from(spaceFirst, 'base64'));
assertArrEq(_fromBase64(spaceFirst, { onInvalidInput: 'skip' }), Buffer.from(spaceFirst, 'base64'));

const spaceLast = benchmarkBase64Std + '\n'.repeat(12345678);
console.log('lots of space after     ');
assertArrEq(_fromBase64(spaceLast), Buffer.from(spaceLast, 'base64'));
assertArrEq(_fromBase64(spaceLast, { onInvalidInput: 'skip' }), Buffer.from(spaceLast, 'base64'));

const equalsMiddle = benchmarkBase64Std.slice(0, 400_000 - 1) + '=' + benchmarkBase64Std.slice(400_000 - 1);
console.log('equals in = the middle');
assertArrEq(_fromBase64(equalsMiddle, { onInvalidInput: 'skip' }), Buffer.from(equalsMiddle, 'base64'));

const equalsMiddle2 = benchmarkBase64Std.slice(0, 400_000 - 2) + '==' + benchmarkBase64Std.slice(400_000 - 2);
console.log('equals in == the middle');
assertArrEq(_fromBase64(equalsMiddle2, { onInvalidInput: 'skip' }), Buffer.from(equalsMiddle2, 'base64'));

console.log('Tests passed\n');


console.log('Decoding base64 with invalid characters (strict) ...');

function expectBase64Error(b64: string) {
  let err = null;
  try {
    _fromBase64(b64)
  } catch (e) {
    err = e
  } finally {
    if (!err) throw new Error(`Should have caught error: ${b64}`);
    else console.log(`As expected -- ${err}`);
  }
}

_fromBase64('');
_fromBase64('AAA=');
_fromBase64('AA BB CC ++');
_fromBase64(' AAaa88ZZ00\n\n\n\n\n\nAAaa//ZZ00\t\tAAaaZZ0099  == ');
_fromBase64(' AAaa88ZZ00\n\n\f\f\n\nAAaa//ZZ00\t\tAAaaZZ0099  == ');
_fromBase64(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099==😀', { onInvalidInput: 'skip' });
expectBase64Error('\u1234QUJDREVG');  // Latin-1 low byte is '4'; must not become valid in strict mode
expectBase64Error('QUJD\u013D');      // U+013D → '='; must not decode as padded "QUJD"
expectBase64Error('**********');
expectBase64Error('AAaaZZ.aa');
expectBase64Error('AAaaZZ00-');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\t~AAaaZZ0099== ');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099 😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099  😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099   😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099==😀');
expectBase64Error(' AAaa88ZZ00\fAAaa//ZZ00\tAAaaZZ0099== 😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099==  😀');
expectBase64Error(' AAaa88ZZ00\fAAaa//ZZ00\tAAaaZZ0099==   😀');
expectBase64Error('\n'.repeat(12345678) + '*');
expectBase64Error(benchmarkBase64Std + ':::' + benchmarkBase64Std);

console.log('Tests passed\n');


console.log('Decoding base64 with bad padding or a dangling sextet (strict vs native) ...');

function expectBase64MatchesNative(b64: string) {
  if (typeof Uint8Array.fromBase64 !== 'function') {
    throw new Error('Uint8Array.fromBase64 is required to check throw-mode against Node/Bun native decoding');
  }

  let localErr: unknown = null;
  let nativeErr: unknown = null;
  let local: Uint8Array | undefined;
  let native: Uint8Array | undefined;

  try { 
    local = _fromBase64(b64); 
  } catch (e) { localErr = e; }
  try {
    native = Uint8Array.fromBase64(b64);
  } catch (e) { nativeErr = e; }

  if (!localErr !== !nativeErr) {
    const hex = (u: Uint8Array) => {
      const h = Buffer.from(u).toString('hex');
      return h ? `decoded ${h}` : 'decoded (empty)';
    };
    const localDesc = localErr ? `threw ${localErr}` : hex(local!);
    const nativeDesc = nativeErr ? `threw ${nativeErr}` : hex(native!);
    const preview = b64.length < 80 ? JSON.stringify(b64) : `length ${b64.length} starting ${JSON.stringify(b64.slice(0, 40))}`;
    throw new Error(`throw-mode vs native mismatch for ${preview}: local ${localDesc} vs native ${nativeDesc}`);
  }
  if (!localErr) assertArrEq(local!, native!, b64);
  else console.log(`As expected -- both threw for ${b64.length < 80 ? JSON.stringify(b64) : `length ${b64.length}`}: ${localErr}`);
}

// dangling sextet: one leftover alphabet character, not a full byte
expectBase64MatchesNative('A');
expectBase64MatchesNative('A=');
expectBase64MatchesNative('A==');
expectBase64MatchesNative('K');
expectBase64MatchesNative('AAAAA');
expectBase64MatchesNative('abcd+');

// bad padding: wrong number of =, or data after padding
expectBase64MatchesNative('QQ=');
expectBase64MatchesNative('AA=');
expectBase64MatchesNative('Kg=');
expectBase64MatchesNative('YQ=');
expectBase64MatchesNative('AAAA=');
expectBase64MatchesNative('YWFh=');
expectBase64MatchesNative('YWFh==');
expectBase64MatchesNative('====');
expectBase64MatchesNative('YQ==ZZ');
expectBase64MatchesNative('YQ==YQ==');
expectBase64MatchesNative('YQ=Z');
expectBase64MatchesNative(equalsMiddle);
expectBase64MatchesNative(equalsMiddle2);

console.log('Tests passed\n');


console.log('Decoding base64 with invalid characters (lax) ...');

function expectBase64Skip(b64: string) {
  const
    localLax = _fromBase64(b64, { onInvalidInput: 'skip' }),
    nodeLax = Buffer.from(b64, 'base64');

  assertArrEq(localLax, nodeLax, b64);
}

expectBase64Skip('');
expectBase64Skip('K');
expectBase64Skip('K=');
expectBase64Skip('K==');
expectBase64Skip('K===');
expectBase64Skip('Kg');
expectBase64Skip('Kg=');
expectBase64Skip('Kg==');
expectBase64Skip('A');
expectBase64Skip('A=');
expectBase64Skip('A==');
expectBase64Skip('AAAAA');
expectBase64Skip('abcd+');
expectBase64Skip('QQ=');
expectBase64Skip('AA=');
expectBase64Skip('YQ=');
expectBase64Skip('AAAA=');
expectBase64Skip('YWFh=');
expectBase64Skip('YWFh==');
expectBase64Skip('====');
expectBase64Skip('YQ==ZZ');
expectBase64Skip('YQ==YQ==');
expectBase64Skip('YQ=Z');
expectBase64Skip('**********');
expectBase64Skip('AAaaZZ.aa');
expectBase64Skip('AAaaZZ00-');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00\t~AAaaZZ0099== ');
expectBase64Skip(' AA``aa88ZZ(00)\nAA|aa//ZZ00\t~AAaaZZ0099== "');
expectBase64Skip(' AAaa88ZZ00\nAAaa/😀/ZZ00\tAAaaZZ0099== ');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099== 😀');
expectBase64Skip(' AAaa88ZZ00 \nAAaa//ZZ00\tAAaaZZ0099==  😀');
expectBase64Skip(' AAaa88ZZ00\fAAaa//ZZ00 \tAAaaZZ0099==   😀');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00 \tAAaaZZ0099==   😀');
expectBase64Skip(' 😀😀😀😀😀😀😀😀😀😀ZZ');
expectBase64Skip('\u1234QUJDREVG');
expectBase64Skip('QUJD\u013D');
expectBase64Skip(benchmarkBase64Std + ':::' + benchmarkBase64Std);

const
  b64NoBad = Buffer.from(
    'Man is distinguished, not only by his reason, but by this ' +
    'singular passion from other animals, which is a lust ' +
    'of the mind, that by a perseverance of delight in the ' +
    'continued and indefatigable generation of knowledge, ' +
    'exceeds the short vehemence of any carnal pleasure.',
    'utf-8'
  ).toString('base64'),
  b64WithBad =
    b64NoBad.slice(0, 60) + ' \x80' +
    b64NoBad.slice(60, 120) + ' \xff' +
    b64NoBad.slice(120, 180) + ' \x00' +
    b64NoBad.slice(180, 240) + ' \x98' +
    b64NoBad.slice(240, 300) + '\x03' +
    b64NoBad.slice(300, 360);

expectBase64Skip(b64WithBad);

console.log('Tests passed\n');


console.log('Encoding as hex ...');

const
  rNodeBuffer = arrays.map(arr => Buffer.from(arr).toString('hex')),
  rTextDecoderInChunks = arrays.map(arr => _toHexChunked(arr));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) assertStrEq(rNodeBuffer[i], rTextDecoderInChunks[i]);

console.log('Tests passed\n');


console.log('Decoding back from hex and checking results ...');

for (let i = 0; i < arrays.length; i++) {
  const
    data = arrays[i],
    hex = rNodeBuffer[i],
    dataAgain = _fromHexChunked(hex);

  assertArrEq(data, dataAgain);
}

console.log('Tests passed\n');


console.log('Testing exact chunk boundaries ...');

const chunkBoundaryLengths = [
  504_000 - 1, 504_000, 504_000 + 1,
  756_000 - 1, 756_000, 756_000 + 1,
  1_008_000 - 1, 1_008_000, 1_008_000 + 1,
];
for (const length of chunkBoundaryLengths) {
  const data = new Uint8Array(length);
  data[0] = 1;
  data[length >>> 1] = 127;
  data[length - 1] = 255;
  const expectedHex = Buffer.from(data).toString('hex');
  const expectedBase64 = Buffer.from(data).toString('base64');
  assertStrEq(_toHexChunked(data), expectedHex);
  assertArrEq(_fromHexChunked(expectedHex), data, `hex chunk boundary ${length}`);
  assertStrEq(_toBase64Chunked(data), expectedBase64);
  assertArrEq(_fromBase64(expectedBase64), data, `base64 chunk boundary ${length}`);
}

console.log('Tests passed\n');


console.log('Decoding hex with invalid characters (strict) ...');

function expectHexError(hex: string) {
  let err = null;
  try {
    _fromHexChunked(hex)
  } catch (e) {
    err = e
  } finally {
    if (!err) throw new Error(`Should have caught error: ${hex}`);
    else console.log(`As expected -- ${err}`);
  }
}

_fromHexChunked('');
_fromHexChunked('00');
expectHexError('001');
expectHexError('0123456789abcdef0g');
expectHexError('0123456789xxabcdef');
expectHexError('11FFG0');
expectHexError('x');
expectHexError('😀00');
expectHexError('00ff9£');
expectHexError('£00ff9£');
expectHexError('00ff😀');
expectHexError('123456==00');
expectHexError(benchmarkHex + ' 123456789');

console.log('Tests passed\n');


console.log('Checking error indexes ...');

assertThrows(() => _fromHexChunked('00ffgg'), 'index 4');
assertThrows(() => _fromHexChunked('gg00'), 'index 0');
const hexChunkBoundary = '00'.repeat(504_000) + 'gg';
assertThrows(() => _fromHexChunked(hexChunkBoundary), 'index 1008000');
assertThrows(() => _fromBase64('QUJD.REVG'), 'index 4');
assertThrows(() => _fromBase64('QUJDREVG😀'), 'index 8');
assertThrows(() => _fromBase64('QUJD=REVG'), 'index 5');
assertThrows(() => _fromBase64('QUJDRE==😀'), 'index 8');

console.log('Tests passed\n');


console.log('Decoding hex with invalid characters (lax) ...');

function expectHexTrunc(hex: string) {
  const
    localLax = _fromHexChunked(hex, { onInvalidInput: 'truncate' }),
    nodeLax = Buffer.from(hex, 'hex');

  assertArrEq(localLax, nodeLax);
}

_fromHexChunked('');
_fromHexChunked('00');
expectHexTrunc('001');
expectHexTrunc('0123456789abcdef0g');
expectHexTrunc('0123456789xxabcdef');
expectHexTrunc('11FFG0');
expectHexTrunc('x');
expectHexTrunc('😀00');
expectHexTrunc('00ff9£');
expectHexTrunc('£00ff9£');
expectHexTrunc('00ff😀');
expectHexTrunc('123456==00');
expectHexTrunc(benchmarkHex + ' 123456789');

console.log('Tests passed\n');
console.log('✅ All tests passed\n');
