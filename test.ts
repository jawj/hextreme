import {
  _toHex,
  _toHexChunked,
  _fromHex,
  _fromHexChunked,
  _toBase64,
  _toBase64Chunked,
  _fromBase64,
} from './src/index';

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

console.log('Generating random test data ...');

const
  lengths = [...new Array(102).fill(0).map((_, i) => i), 1010, 10101, 101010, 1010104, 33554433],
  arrays = lengths.map(length => {
    const arr = new Uint8Array(length);
    for (let i = 0; i < length; i++) arr[i] = Math.random() * 256 >> 0;
    return arr;
  }),
  benchmarkArray = arrays[arrays.length - 1],
  benchmarkBuffer = Buffer.from(benchmarkArray),
  benchmarkHex = benchmarkBuffer.toString('hex'),
  benchmarkBase64Std = benchmarkBuffer.toString('base64');

arrays[49] = arrays[49].subarray(1);  // odd offset

console.log('Generated\n');


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
assertArrEq(_fromBase64(equalsMiddle), Buffer.from(equalsMiddle, 'base64'));
assertArrEq(_fromBase64(equalsMiddle, { onInvalidInput: 'skip' }), Buffer.from(equalsMiddle, 'base64'));

const equalsMiddle2 = benchmarkBase64Std.slice(0, 400_000 - 2) + '==' + benchmarkBase64Std.slice(400_000 - 2);
console.log('equals in == the middle');
assertArrEq(_fromBase64(equalsMiddle2), Buffer.from(equalsMiddle2, 'base64'));
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
_fromBase64(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099==😀', { onInvalidInput: 'skip' });
expectBase64Error('**********');
expectBase64Error('AAaaZZ.aa');
expectBase64Error('AAaaZZ00-');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\t~AAaaZZ0099== ');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099 😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099  😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099   😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099==😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099== 😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099==  😀');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099==   😀');
expectBase64Error('\n'.repeat(12345678) + '*');
expectBase64Error(benchmarkBase64Std + ':::' + benchmarkBase64Std);

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
expectBase64Skip('**********');
expectBase64Skip('AAaaZZ.aa');
expectBase64Skip('AAaaZZ00-');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00\t~AAaaZZ0099== ');
expectBase64Skip(' AA``aa88ZZ(00)\nAA|aa//ZZ00\t~AAaaZZ0099== "');
expectBase64Skip(' AAaa88ZZ00\nAAaa/😀/ZZ00\tAAaaZZ0099== ');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099== 😀');
expectBase64Skip(' AAaa88ZZ00 \nAAaa//ZZ00\tAAaaZZ0099==  😀');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00 \tAAaaZZ0099==   😀');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00 \tAAaaZZ0099==   😀');
expectBase64Skip(' 😀😀😀😀😀😀😀😀😀😀ZZ');
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
