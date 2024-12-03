# hextreme

Hex and base64 string encoding and decoding for `Uint8Array` — like native [`.toHex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toHex)/[`.fromHex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromHex) and [`.toBase64()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64)/[`.fromBase64()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64), which are not yet widely supported.

Intended to be as fast as reasonably possible using only plain JavaScript.

The secret ingredients are: 

* Conversion between strings and arrays via `TextEncoder` and `TextDecoder`
* Multi-byte reads, writes and lookups using `Uint16Array` and `Uint32Array`
* A little bit of loop unrolling (which makes a real difference in Chrome/V8)

No external dependencies. 4KB zipped. Exports ESM, CJS, and TypeScript types.


## Performance

The following benchmarks were run on an M3 Pro MacBook Pro, using 32 MiB of random data, and taking the mean of 10 trials.

The headlines are that we are:

* 5 – 27x **faster** than a representative JS approach ([feross/buffer](https://github.com/feross) shim package)
* 4 – 7x **faster** than Firefox's native methods (which is strange: Firefox can surely improve on this)
* 6 – 17x **slower** than Safari's native methods

```
                                   Chrome          Firefox             Safari
                            131.0.6778.86            133.0   Tech Preview 207

* Encode hex

This library                     34.19 ms         32.40 ms           25.10 ms
cf. native toHex                        -        123.60 ms            4.30 ms
cf. feross/buffer.toString      929.13 ms        213.70 ms          362.80 ms

* Decode hex

This library                     64.87 ms         34.40 ms           90.50 ms
cf. native fromHex                      -        232.40 ms            6.30 ms
cf. feross/buffer.from          771.01 ms        549.20 ms         1306.10 ms

* Encode base64

This library                     17.16 ms         21.30 ms           40.90 ms
cf. native toBase64                     -         84.10 ms            2.80 ms
cf. feross/buffer.toString      282.28 ms        195.00 ms          524.10 ms

* Decode base64

This library                     41.69 ms         31.70 ms           64.10 ms
cf. native fromBase64                   -        118.00 ms            3.70 ms
cf. feross/buffer.from          206.83 ms        245.80 ms          276.70 ms
```

