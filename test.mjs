import {
  fromHex,
  toHex,
  _toHexUsingStringConcat,
  _toHexUsingTextDecoder,
  _toHexInChunksUsingTextDecoder,
  toBase64,
} from './index.mjs';

import smithy from '@smithy/util-hex-encoding';
import bufferShimDefault from 'buffer/index.js';  // just 'buffer' imports Node native implementation
const BufferShim = bufferShimDefault.Buffer;

console.log('Generating random test data ...\n');

const
  lengths = [0, 1, 6, 7, 8, 9, 101, 1010, 10101, 101010, 1010104, 10101010],
  arrays = lengths.map(length => {
    const arr = new Uint8Array(length);
    for (let i = 0; i < length; i++) arr[i] = Math.random() * 256 >> 0;
    return arr;
  }),
  benchmarkArray = arrays[arrays.length - 1],
  benchmarkBuffer = Buffer.from(benchmarkArray),
  benchmarkBufferShim = BufferShim.from(benchmarkArray),
  benchmarkHex = benchmarkBuffer.toString('hex');


console.log('Converting to base64 ...');

const
  rNodeBufferB64Std = arrays.map(arr => Buffer.from(arr).toString('base64')),
  rToBase64Std = arrays.map(arr => toBase64(arr, true, false));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (rNodeBufferB64Std[i] !== rToBase64Std[i]) {
    throw new Error(`base64 mismatch for array length ${lengths[i]}:
  toString('base64'): ${rNodeBufferB64Std[i]}
  toBase64: ${rToBase64Std[i]}`);
  }
}

console.log('All tests passed\n');


console.log('Converting to base64url ...');

const
  rNodeBufferB64Url = arrays.map(arr => Buffer.from(arr).toString('base64url')),
  rToBase64Url = arrays.map(arr => toBase64(arr, false, true));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (rNodeBufferB64Url[i] !== rToBase64Url[i]) {
    throw new Error(`base64url mismatch for array length ${lengths[i]}:
  toString('base64url'): ${rNodeBufferB64Url[i]}
  toBase64: ${rToBase64Url[i]}`);
  }
}

console.log('All tests passed\n');


console.log('Converting to hex ...');

const
  rNodeBuffer = arrays.map(arr => Buffer.from(arr).toString('hex')),
  rToHex = arrays.map(arr => toHex(arr)),
  rStringConcat = arrays.map(arr => _toHexUsingStringConcat(arr)),
  rTextDecoder = arrays.map(arr => _toHexUsingTextDecoder(arr)),
  rTextDecoderInChunks = arrays.map(arr => _toHexInChunksUsingTextDecoder(arr));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (
    rNodeBuffer[i] !== rToHex[i] ||
    rNodeBuffer[i] !== rStringConcat[i] ||
    rNodeBuffer[i] !== rTextDecoder[i] ||
    rNodeBuffer[i] !== rTextDecoderInChunks[i]
  ) {
    throw new Error(`Hex mismatch for array length ${lengths[i]}:
  toString('hex'): ${rNodeBuffer[i]}
  toHex: ${rToHex[i]}
  _toHexUsingStringConcat: ${rStringConcat[i]}
  _toHexUsingTextDecoder: ${rTextDecoder[i]}
  _toHexInChunksUsingTextDecoder: ${rTextDecoderInChunks[i]}`);
  }
}

console.log('All tests passed\n');


console.log('Converting back from hex and checking results ...');

for (let i = 0; i < arrays.length; i++) {
  const
    data = arrays[i],
    hex = rNodeBuffer[i],
    dataAgain = fromHex(hex);

  if (dataAgain.length !== data.length) throw new Error(`Length mismatch`);
  for (let j = 0; j < data.length; j++) {
    if (data[j] !== dataAgain[j]) throw new Error(`Value mismatch: ${data} != ${dataAgain}`);
  }
}
console.log('All tests passed\n');


console.log('fromHex with invalid hex ...');

function expectError(hex) {
  let err = null;
  try {
    fromHex(hex)
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

console.log('All tests passed\n');


console.log('fromHex with invalid hex (lax mode) ...');

function expectTrunc(hex) {
  const
    localLax = fromHex(hex, true),
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

console.log('All tests passed\n');


console.log(`Benchmarking with ${(benchmarkArray.length / 2 ** 20).toFixed(1)} MiB of random data ...`);
console.log()

function benchmark(fn, iterations) {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const t1 = performance.now();
  return ((t1 - t0) / iterations).toFixed(2);
}

let iterations = 10;

console.log('* Encode base64\n')
console.log(`toBase64: ${benchmark(() => toBase64(benchmarkArray, true, false), iterations)} ms`);
console.log('  + compare other implementations')
console.log(`Native Buffer.toString: ${benchmark(() => benchmarkBuffer.toString('base64'), iterations)} ms`);
console.log(`Shimmed Buffer.toString: ${benchmark(() => benchmarkBufferShim.toString('base64'), iterations)} ms`);
console.log();

console.log('* Encode base64url\n')
console.log(`toBase64: ${benchmark(() => toBase64(benchmarkArray, false, true), iterations)} ms`);
console.log('  + compare other implementations')
console.log(`Native Buffer.toString: ${benchmark(() => benchmarkBuffer.toString('base64url'), iterations)} ms`);
//console.log(`Shimmed Buffer.toString: ${benchmark(() => benchmarkBufferShim.toString('base64url'), iterations)} ms`);
console.log(`Shimmed Buffer.toString: (not yet supported)`);
console.log();

console.log('* Encode hex\n')
console.log(`toHex: ${benchmark(() => toHex(benchmarkArray), iterations)} ms`);
console.log(`_toHexUsingTextDecoder: ${benchmark(() => _toHexUsingTextDecoder(benchmarkArray), iterations)} ms`);
console.log(`_toHexInChunksUsingTextDecoder: ${benchmark(() => _toHexInChunksUsingTextDecoder(benchmarkArray), iterations)} ms`);
console.log(`_toHexUsingStringConcat: ${benchmark(() => _toHexUsingStringConcat(benchmarkArray), iterations)} ms`);
console.log('  + compare other implementations')
console.log(`Native Buffer.toString: ${benchmark(() => benchmarkBuffer.toString('hex'), iterations)} ms`);
console.log(`Shimmed Buffer.toString: ${benchmark(() => benchmarkBufferShim.toString('hex'), iterations)} ms`);
console.log(`@smithy/util-hex-encoding toHex: ${benchmark(() => smithy.toHex(benchmarkArray), iterations)} ms`);
console.log();

console.log('* Decode hex\n')
console.log(`fromHex: ${benchmark(() => fromHex(benchmarkHex), iterations)} ms`);
console.log('  + compare other implementations')
console.log(`Native Buffer.fromString: ${benchmark(() => Buffer.from(benchmarkHex, 'hex'), iterations)} ms`);
console.log(`Shimmed Buffer.fromString: ${benchmark(() => BufferShim.from(benchmarkHex, 'hex'), iterations)} ms`);
console.log(`@smithy/util-hex-encoding fromHex: ${benchmark(() => smithy.fromHex(benchmarkHex), iterations)} ms`);
console.log();

