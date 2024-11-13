import { toHex, _toHexUsingStringConcat, _toHexUsingTextDecoder, _toHexInChunksUsingTextDecoder } from './index.mjs';

console.log('Generating random test data ...');

const lengths = [0, 1, 6, 7, 8, 9, 101, 1010, 10101, 101010, 1010101, 51010101];
const arrays = lengths.map(length => {
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.random() * 256 >> 0;
  }
  return arr;
});

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
    throw new Error(`Mismatch for array length ${lengths[i]}:
  toString('hex'): ${rNodeBuffer[i]}
  toHex: ${rToHex[i]}
  _toHexUsingStringConcat: ${rStringConcat[i]}
  _toHexUsingTextDecoder: ${rTextDecoder[i]}
  _toHexInChunksUsingTextDecoder: ${rTextDecoderInChunks[i]}`);
  }
}

console.log('All tests passed :)\n');


const
  benchmarkArray = arrays[arrays.length - 1],
  benchmarkBuffer = Buffer.from(benchmarkArray);

console.log(`Benchmarking ${(benchmarkArray.length / 2 ** 20).toFixed(1)} MiB ...`);

function benchmark(fn,) {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const t1 = performance.now();
  return ((t1 - t0) / iterations).toFixed(2);
}

let iterations;

iterations = 20;
console.log(`Buffer.toString: ${benchmark(() => benchmarkBuffer.toString('hex'))} ms`);
console.log(`toHex: ${benchmark(() => toHex(benchmarkArray))} ms`);
console.log(`_toHexUsingTextDecoder: ${benchmark(() => _toHexUsingTextDecoder(benchmarkArray))} ms`);
console.log(`_toHexInChunksUsingTextDecoder: ${benchmark(() => _toHexInChunksUsingTextDecoder(benchmarkArray))} ms`);

iterations = 3;
console.log(`_toHexUsingStringConcat: ${benchmark(() => _toHexUsingStringConcat(benchmarkArray))} ms`);
