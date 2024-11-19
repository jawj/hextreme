# hextreme

Fast hex string generation for `Uint8Array`, like [`.toHex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toHex).

As at November 2024 on an M3 Pro MacBook Pro, this implementation is about 2x **faster** than the native `.toHex()` in Firefox 133b7, and about 2.5x slower than the one in Safari Tech Preview 207. 

It's also about 2x slower than the native `.toString('hex')` in Node 22.11 and about 5x slower than the one in Bun 1.1.34.

It is many times faster than any standard approach using either string concatenation or `join()`.

Performance tests can be seen at https://jsbench.me/evm3ejel2i/5.

What we do is this:

* If `.toHex()` is present on the object, we just call it.

* Otherwise, as long as `TextDecoder` is available, we map one-byte source values to two-byte output (ASCII character) values in a `Uint16Array`, and then decode this to a string. We do this in 1MB chunks to avoid huge memory allocations.

* Or if `TextDecoder` is not available, we fall back on a string-concatenation approach.

For both the `TextDecoder` and string concatenation approaches, we do some manual loop-unrolling using a kind of JS equivalent of Duff's device. This makes very little difference in Firefox and Safari, but speeds things up considerably in Chrome.

A test run looks like this:

```
% npm run test

> hextreme@0.1.0 test
> npm run testNode && npm run testBun


> hextreme@0.1.0 testNode
> node test.mjs

Generating random test data ...
Converting to hex ...
Checking results ...
All tests passed :)

Benchmarking 48.6 MiB ...
Buffer.toString: 24.18 ms
toHex: 49.65 ms
_toHexUsingTextDecoder: 50.71 ms
_toHexInChunksUsingTextDecoder: 50.61 ms
_toHexUsingStringConcat: 2035.04 ms

> hextreme@0.1.0 testBun
> bun test.mjs

Generating random test data ...
Converting to hex ...
Checking results ...
All tests passed :)

Benchmarking 48.6 MiB ...
Buffer.toString: 5.84 ms
toHex: 3.08 ms
_toHexUsingTextDecoder: 27.54 ms
_toHexInChunksUsingTextDecoder: 24.02 ms
_toHexUsingStringConcat: 369.94 ms
```