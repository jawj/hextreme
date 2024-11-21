import {
  toHex,
  _toHex,
  _toHexChunked,
  fromHex,
  _fromHex,
  _fromHexChunked,
  _toBase64,
  _toBase64Chunked,
} from './index.mjs';

import smithy from '@smithy/util-hex-encoding';
import bufferShimDefault from 'buffer/index.js';  // just 'buffer' imports Node native implementation
const BufferShim = bufferShimDefault.Buffer;

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
  benchmarkHex = benchmarkBuffer.toString('hex');

console.log('Generated\n');


console.log('Encoding as base64 ...');

const
  rNodeBufferB64Std = arrays.map(arr => Buffer.from(arr).toString('base64')),
  rToBase64Std = arrays.map(arr => _toBase64Chunked(arr, true, false));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (rNodeBufferB64Std[i] !== rToBase64Std[i]) {
    throw new Error(`base64 mismatch for array length ${lengths[i]}:
  toString('base64'): '${rNodeBufferB64Std[i]}' (${rNodeBufferB64Std[i].length})
  _toBase64Chunked: '${rToBase64Std[i]}' (${rToBase64Std[i].length})`);
  }
}

console.log('Tests passed\n');


console.log('Encoding as base64url ...');

const
  rNodeBufferB64Url = arrays.map(arr => Buffer.from(arr).toString('base64url')),
  rToBase64Url = arrays.map(arr => _toBase64Chunked(arr, false, true));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (rNodeBufferB64Url[i] !== rToBase64Url[i]) {
    throw new Error(`base64url mismatch for array length ${lengths[i]}:
  toString('base64url'): ${rNodeBufferB64Url[i]}
  _toBase64Chunked: ${rToBase64Url[i]}`);
  }
}

console.log('Tests passed\n');


console.log('Encoding as hex ...');

const
  rNodeBuffer = arrays.map(arr => Buffer.from(arr).toString('hex')),
  rToHex = arrays.map(arr => toHex(arr)),
  rTextDecoder = arrays.map(arr => _toHex(arr)),
  rTextDecoderInChunks = arrays.map(arr => _toHexChunked(arr));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (
    rNodeBuffer[i] !== rToHex[i] ||
    rNodeBuffer[i] !== rTextDecoder[i] ||
    rNodeBuffer[i] !== rTextDecoderInChunks[i]
  ) {
    throw new Error(`Hex mismatch for array length ${lengths[i]}:
  toString('hex'): ${rNodeBuffer[i]}
  toHex: ${rToHex[i]}
  _toHex: ${rTextDecoder[i]}
  _toHexChunked: ${rTextDecoderInChunks[i]}`);
  }
}

console.log('Tests passed\n');


console.log('Decoding back from hex and checking results ...');

for (let i = 0; i < arrays.length; i++) {
  const
    data = arrays[i],
    hex = rNodeBuffer[i],
    dataAgain = _fromHexChunked(hex);

  if (dataAgain.length !== data.length) throw new Error(`Length mismatch`);
  for (let j = 0; j < data.length; j++) {
    if (data[j] !== dataAgain[j]) throw new Error(`Value mismatch: ${data} != ${dataAgain}`);
  }
}

console.log('Tests passed\n');


console.log('Decoding hex with invalid characters (strict) ...');

function expectError(hex) {
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

fromHex('');
fromHex('00');
expectError('001');
expectError('0123456789abcdef0g');
expectError('0123456789xxabcdef');
expectError('11FFG0');
expectError('x');
expectError('😀00');
expectError('00ff9£');
expectError('£00ff9£');
expectError('00ff😀');
expectError('123456==00');
expectError(benchmarkHex + ' 123456789');

console.log('Tests passed\n');


console.log('Decoding hex with invalid characters (lax) ...');

function expectTrunc(hex) {
  const
    localLax = _fromHexChunked(hex, true),
    nodeLax = Buffer.from(hex, 'hex');

  if (localLax.length !== nodeLax.length) throw new Error(`Lax hex parsing results in different length to Node: ${toHex(localLax)} instead of ${toHex(nodeLax)}`);
  for (let i = 0; i < localLax.length; i++) if (localLax[i] != nodeLax[i]) throw new Error(`Lax hex parsing results in different result to Node: ${toHex(localLax)} instead of ${toHex(nodeLax)}`);
}

fromHex('', true);
fromHex('00', true);
expectTrunc('001');
expectTrunc('0123456789abcdef0g');
expectTrunc('0123456789xxabcdef');
expectTrunc('11FFG0');
expectTrunc('x');
expectTrunc('😀00');
expectTrunc('00ff9£');
expectTrunc('£00ff9£');
expectTrunc('00ff😀');
expectTrunc('123456==00');
expectTrunc(benchmarkHex + ' 123456789');

console.log('Tests passed\n');
console.log('✅ All tests passed\n');


let iterations = 8;

console.log(`Benchmarking ${(benchmarkArray.length / 2 ** 20).toFixed(1)} MiB random data, mean of ${iterations} iterations ...`);
console.log()

function benchmark(fn, iterations) {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const t1 = performance.now();
  const t = (t1 - t0) / iterations;
  const s = t.toFixed(2);
  let out = `${' '.repeat(7 - s.length)}${s} ms`;
  return out;
}

console.log('* Encode base64\n')
console.log(`_toBase64Chunked                       ${benchmark(() => _toBase64Chunked(benchmarkArray, true, false), iterations)}`);
console.log(`cf. native Buffer.toString             ${benchmark(() => benchmarkBuffer.toString('base64'), iterations)}`);
console.log(`cf. feross/buffer.toString             ${benchmark(() => benchmarkBufferShim.toString('base64'), iterations)}`);
console.log();

console.log('* Encode base64url\n')
console.log(`_toBase64Chunked                       ${benchmark(() => _toBase64Chunked(benchmarkArray, false, true), iterations)}`);
console.log(`cf. native Buffer toString             ${benchmark(() => benchmarkBuffer.toString('base64url'), iterations)}`);
//console.log(`cf. feross/buffer toString: ${benchmark(() => benchmarkBufferShim.toString('base64url'), iterations)} ms`);
console.log(`cf. feross/buffer toString    (not yet supported)`);
console.log();

console.log('* Encode hex\n')
console.log(`toHex                                  ${benchmark(() => toHex(benchmarkArray), iterations)}`);
console.log(`_toHex                                 ${benchmark(() => _toHex(benchmarkArray), iterations)}`);
console.log(`_toHexChunked                          ${benchmark(() => _toHexChunked(benchmarkArray), iterations)}`);
console.log(`cf. native Buffer toString             ${benchmark(() => benchmarkBuffer.toString('hex'), iterations)}`);
console.log(`cf. feross/buffer toString             ${benchmark(() => benchmarkBufferShim.toString('hex'), iterations)}`);
console.log(`cf. @smithy/util-hex-encoding toHex    ${benchmark(() => smithy.toHex(benchmarkArray), iterations)}`);
console.log();

console.log('* Decode hex\n')
console.log(`fromHex                                ${benchmark(() => fromHex(benchmarkHex), iterations)}`);
console.log(`cf. native Buffer fromString           ${benchmark(() => Buffer.from(benchmarkHex, 'hex'), iterations)}`);
console.log(`cf. feross/buffer fromString           ${benchmark(() => BufferShim.from(benchmarkHex, 'hex'), iterations)}`);
console.log(`cf. @smithy/util-hex-encoding fromHex  ${benchmark(() => smithy.fromHex(benchmarkHex), iterations)}`);
console.log();

