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

export function perf() {
  const
    BufferShim = bufferShimDefault.Buffer,
    length = 33554433,
    benchmarkArray = new Uint8Array(length);

  for (let i = 0; i < length; i++) benchmarkArray[i] = Math.random() * 256 >>> 0;

  const
    benchmarkBuffer = typeof Buffer !== 'undefined' ? Buffer.from(benchmarkArray) : null,
    benchmarkBufferShim = BufferShim.from(benchmarkArray),
    benchmarkBase64Std = _toBase64Chunked(benchmarkArray),
    benchmarkBase64Url = _toBase64Chunked(benchmarkArray, { alphabet: 'base64url' }),
    benchmarkHex = _toHexChunked(benchmarkArray);

  let iterations = 10;

  console.log(`Benchmarking ${(benchmarkArray.length / 2 ** 20).toFixed(1)} MiB random data, mean of ${iterations} iterations ...`);
  console.log()

  function benchmark(fn: () => any, iterations: number) {
    try { fn() } catch (err: any) { return `      –` }
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
  // @ts-ignore
  console.log(`cf. native toBase64                    ${benchmark(() => benchmarkArray.toBase64(), iterations)}`);
  // @ts-ignore
  console.log(`cf. native Buffer.toString             ${benchmark(() => benchmarkBuffer.toString('base64'), iterations)}`);
  console.log(`cf. feross/buffer.toString             ${benchmark(() => benchmarkBufferShim.toString('base64'), iterations)}`);
  console.log();

  console.log('* Decode base64\n')
  console.log(`_fromBase64                            ${benchmark(() => _fromBase64(benchmarkBase64Std), iterations)}`);
  // @ts-ignore
  console.log(`cf. native fromBase64                  ${benchmark(() => Uint8Array.fromBase64(benchmarkBase64Std), iterations)}`);
  console.log(`cf. native Buffer.from                 ${benchmark(() => Buffer.from(benchmarkBase64Std, 'base64'), iterations)}`);
  console.log(`cf. feross/buffer.from                 ${benchmark(() => BufferShim.from(benchmarkBase64Std, 'base64'), iterations)}`);
  console.log();

  console.log('* Encode base64url\n')
  console.log(`_toBase64Chunked                       ${benchmark(() => _toBase64Chunked(benchmarkArray, { alphabet: 'base64url', omitPadding: true }), iterations)}`);
  // @ts-ignore
  console.log(`cf. native toBase64                    ${benchmark(() => benchmarkArray.toBase64({ alphabet: 'base64url' }), iterations)}`);
  // @ts-ignore
  console.log(`cf. native Buffer.toString             ${benchmark(() => benchmarkBuffer.toString('base64url'), iterations)}`);
  console.log(`cf. feross/buffer.toString             ${benchmark(() => benchmarkBufferShim.toString('base64url'), iterations)}`);
  console.log();

  console.log('* Decode base64url\n')
  console.log(`_fromBase64                            ${benchmark(() => _fromBase64(benchmarkBase64Url, { alphabet: 'base64url', onInvalidInput: 'skip' }), iterations)}`);
  // @ts-ignore
  console.log(`cf. native fromBase64                  ${benchmark(() => Uint8Array.fromBase64(benchmarkBase64Url, { alphabet: 'base64url' }), iterations)}`);
  console.log(`cf. native Buffer.from                 ${benchmark(() => Buffer.from(benchmarkBase64Url, 'base64url'), iterations)}`);
  console.log(`cf. feross/buffer.from                 ${benchmark(() => BufferShim.from(benchmarkBase64Url, 'base64url'), iterations)}`);
  console.log();

  console.log('* Encode hex\n')
  console.log(`_toHexChunked                          ${benchmark(() => _toHexChunked(benchmarkArray), iterations)}`);
  // @ts-ignore
  console.log(`cf. native toHex                       ${benchmark(() => benchmarkArray.toHex(), iterations)}`);
  // @ts-ignore
  console.log(`cf. native Buffer.toString             ${benchmark(() => benchmarkBuffer.toString('hex'), iterations)}`);
  console.log(`cf. feross/buffer.toString             ${benchmark(() => benchmarkBufferShim.toString('hex'), iterations)}`);
  console.log();

  console.log('* Decode hex\n')
  console.log(`_fromHexChunked                        ${benchmark(() => _fromHexChunked(benchmarkHex), iterations)}`);
  // @ts-ignore
  console.log(`cf. native fromHex                     ${benchmark(() => Uint8Array.fromHex(benchmarkHex), iterations)}`);
  console.log(`cf. native Buffer.from                 ${benchmark(() => Buffer.from(benchmarkHex, 'hex'), iterations)}`);
  console.log(`cf. feross/buffer.from                 ${benchmark(() => BufferShim.from(benchmarkHex, 'hex'), iterations)}`);
  console.log();

  console.log('Done.');
  return false;  // for browser use
}

// @ts-ignore
globalThis.perf = perf;  // for browser use
