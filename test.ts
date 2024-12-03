import {
  _toHex,
  _toHexChunked,
  _fromHex,
  _fromHexChunked,
  _toBase64,
  _toBase64Chunked,
  _fromBase64,
} from './src/index';

import bufferShimDefault from 'buffer/index.js';  // just 'buffer' imports Node native implementation
const BufferShim = bufferShimDefault.Buffer;

function arrEq(arr1: Uint8Array, arr2: Uint8Array) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0, len = arr1.length; i < len; i++) if (arr1[i] !== arr2[i]) return false;
  return true;
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
  benchmarkBufferShim = BufferShim.from(benchmarkArray),
  benchmarkHex = benchmarkBuffer.toString('hex'),
  benchmarkBase64Std = benchmarkBuffer.toString('base64'),
  benchmarkBase64Url = benchmarkBuffer.toString('base64url');

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
    dataAgain = _fromBase64(base64);

  if (!arrEq(data, dataAgain)) throw new Error(`Mismatch: ${data} != ${dataAgain}`);
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
    base64 = ' '.repeat(Math.floor(Math.random() * 16)) + rNodeBufferB64Url[i] + '\n'.repeat(i % 5),
    dataAgain = _fromBase64(base64, { alphabet: 'base64url' });

  if (!arrEq(data, dataAgain)) throw new Error(`Mismatch: ${data} != ${dataAgain}`);
}

console.log('Tests passed\n');


console.log('Decoding base64 with unusual whitespace ...');

if (!arrEq(_fromBase64(benchmarkBase64Std.split('').join(' ')), _fromBase64(benchmarkBase64Std))) throw new Error('Base 64 decoding error on whitespace between every character');
if (!arrEq(_fromBase64(benchmarkBase64Std + '\n'.repeat(12345678)), _fromBase64(benchmarkBase64Std))) throw new Error('Base 64 decoding error on long whitespace after');
if (!arrEq(_fromBase64('\n'.repeat(12345678) + benchmarkBase64Std), _fromBase64(benchmarkBase64Std))) throw new Error('Base 64 decoding error on long whitespace before');

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
expectBase64Error('**********');
expectBase64Error('AAaaZZ.aa');
expectBase64Error('AAaaZZ00-');
expectBase64Error(' AAaa88ZZ00\nAAaa//ZZ00\t~AAaaZZ0099== ');
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

  if (!arrEq(localLax, nodeLax)) throw new Error(`Mismatch: ${localLax} != ${nodeLax}`);
}

expectBase64Skip('');
expectBase64Skip('**********');
expectBase64Skip('AAaaZZ.aa');
expectBase64Skip('AAaaZZ00-');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00\t~AAaaZZ0099== ');
expectBase64Skip(' AA``aa88ZZ(00)\nAA|aa//ZZ00\t~AAaaZZ0099== "');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099== 😀');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099==  😀');
expectBase64Skip(' AAaa88ZZ00\nAAaa//ZZ00\tAAaaZZ0099==   😀');
expectBase64Skip(benchmarkBase64Std + ':::' + benchmarkBase64Std);

console.log('Tests passed\n');


console.log('Encoding as hex ...');

const
  rNodeBuffer = arrays.map(arr => Buffer.from(arr).toString('hex')),
  rTextDecoderInChunks = arrays.map(arr => _toHexChunked(arr));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (rNodeBuffer[i] !== rTextDecoderInChunks[i]) throw new Error(`Mismatch: ${rTextDecoderInChunks[i]} != ${rNodeBuffer[i]}`);
}

console.log('Tests passed\n');


console.log('Decoding back from hex and checking results ...');

for (let i = 0; i < arrays.length; i++) {
  const
    data = arrays[i],
    hex = rNodeBuffer[i],
    dataAgain = _fromHexChunked(hex);

  if (!arrEq(data, dataAgain)) throw new Error(`Mismatch: ${data} != ${dataAgain}`)
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

    if (!arrEq(localLax, nodeLax)) throw new Error(`Mismatch: ${localLax} != ${nodeLax}`);
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


let iterations = 10;

console.log(`Benchmarking ${(benchmarkArray.length / 2 ** 20).toFixed(1)} MiB random data, mean of ${iterations} iterations ...`);
console.log()

function benchmark(fn: () => any, iterations: number) {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const t1 = performance.now();
  const t = (t1 - t0) / iterations;
  const s = t.toFixed(2);
  let out = `${' '.repeat(7 - s.length)}${s} ms`;
  return out;
}

console.log('* Encode base64\n')
console.log(`_toBase64Chunked                       ${benchmark(() => _toBase64Chunked(benchmarkArray), iterations)}`);
console.log(`cf. native Buffer.toString             ${benchmark(() => benchmarkBuffer.toString('base64'), iterations)}`);
console.log(`cf. feross/buffer.toString             ${benchmark(() => benchmarkBufferShim.toString('base64'), iterations)}`);
console.log();

console.log('* Decode base64\n')
console.log(`_fromBase64                            ${benchmark(() => _fromBase64(benchmarkBase64Std), iterations)}`);
console.log(`cf. native Buffer.from                 ${benchmark(() => Buffer.from(benchmarkBase64Std, 'base64'), iterations)}`);
console.log(`cf. feross/buffer.from                 ${benchmark(() => BufferShim.from(benchmarkBase64Std, 'base64'), iterations)}`);
console.log();

console.log('* Encode base64url\n')
console.log(`_toBase64Chunked                       ${benchmark(() => _toBase64Chunked(benchmarkArray, { alphabet: 'base64url', omitPadding: true }), iterations)}`);
console.log(`cf. native Buffer toString             ${benchmark(() => benchmarkBuffer.toString('base64url'), iterations)}`);
//console.log(`cf. feross/buffer toString: ${benchmark(() => benchmarkBufferShim.toString('base64url'), iterations)} ms`);
console.log(`cf. feross/buffer toString    (not yet supported)`);
console.log();

console.log('* Decode base64url\n')
console.log(`_fromBase64                            ${benchmark(() => _fromBase64(benchmarkBase64Url, { alphabet: 'base64url', onInvalidInput: 'skip' }), iterations)}`);
console.log(`cf. native Buffer.from                 ${benchmark(() => Buffer.from(benchmarkBase64Url, 'base64url'), iterations)}`);
//console.log(`cf. feross/buffer.from                 ${benchmark(() => BufferShim.from(benchmarkBase64Url, 'base64url'), iterations)}`);
console.log(`cf. feross/buffer from        (not yet supported)`);
console.log();

console.log('* Encode hex\n')
console.log(`_toHexChunked                          ${benchmark(() => _toHexChunked(benchmarkArray), iterations)}`);
console.log(`cf. native Buffer toString             ${benchmark(() => benchmarkBuffer.toString('hex'), iterations)}`);
console.log(`cf. feross/buffer toString             ${benchmark(() => benchmarkBufferShim.toString('hex'), iterations)}`);
console.log();

console.log('* Decode hex\n')
console.log(`_fromHexChunked                        ${benchmark(() => _fromHexChunked(benchmarkHex), iterations)}`);
console.log(`cf. native Buffer from                 ${benchmark(() => Buffer.from(benchmarkHex, 'hex'), iterations)}`);
console.log(`cf. feross/buffer from                 ${benchmark(() => BufferShim.from(benchmarkHex, 'hex'), iterations)}`);
console.log();

