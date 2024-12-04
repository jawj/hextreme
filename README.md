# hextreme

Hex and base64 string encoding and decoding for `Uint8Array` — like native [`.toHex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toHex)/[`.fromHex()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromHex) and [`.toBase64()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64)/[`.fromBase64()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64), which are not yet widely supported.

Intended to be as fast as reasonably possible using only plain JavaScript.

The secret ingredients are: 

* Conversion between strings and typed arrays via `TextEncoder` and `TextDecoder`
* Multi-byte reads, writes and lookups using `Uint16Array` and `Uint32Array`
* A little bit of loop unrolling (which makes a real difference in Chrome/V8)

No external dependencies. ESM and CJS exports, plus TypeScript types. 4KB zipped.


## Performance

The following benchmarks were run on an M3 Pro MacBook Pro, using 32 MiB of random data, and taking the mean of 10 trials.

On this machine, across methods and browsers, the headlines are that we are:

* 4 – 27x **faster** than a representative JS implementation: the [feross/buffer](https://github.com/feross) shim package
* 4 – 7x **faster** than Firefox's native methods (surprising — Firefox can surely improve on this)
* 6 – 17x **slower** than Safari's native methods

```
                                   Chrome          Firefox             Safari
                            131.0.6778.86            133.0   Tech Preview 207

* Encode hex

This library                     30.60 ms         32.40 ms           25.10 ms
cf. native toHex                        -        123.60 ms            4.30 ms
cf. feross/buffer.toString      816.42 ms        213.70 ms          362.80 ms

* Decode hex

This library                     60.22 ms         32.60 ms           90.50 ms
cf. native fromHex                      -        229.40 ms            6.30 ms
cf. feross/buffer.from          757.89 ms        546.60 ms         1306.10 ms

* Encode base64

This library                     16.86 ms         20.90 ms           40.90 ms
cf. native toBase64                     -         84.00 ms            2.80 ms
cf. feross/buffer.toString      275.85 ms        203.80 ms          524.10 ms

* Decode base64

This library                     39.51 ms         30.60 ms           64.10 ms
cf. native fromBase64                   -        116.20 ms            3.70 ms
cf. feross/buffer.from          200.30 ms        247.10 ms          276.70 ms
```

## Usage

To install:

```bash
npm install hextreme
```

### Hex encoding

`toHex(bytes: Uint8Array, { alphabet?: 'lower' | 'upper' } = {}): string`

Encodes binary data to a hex string. 

The `alphabet` option defaults to `'lower'`, but may alternatively be set to `'upper'`.

Examples:

```javascript
import { toHex } from 'hextreme';

toHex(new Uint8Array([254, 237, 250, 206]));
// 'feedface'

toHex(new Uint8Array([254, 237, 250, 206]), { alphabet: 'upper' });
// 'FEEDFACE'
```

### Hex decoding

`fromHex(hex: string, { onInvalidInput?: 'throw' | 'truncate' } = {}): Uint8Array`

Decodes a hex string (upper-, lower- or mixed-case) to binary data.

The `onInvalidInput` option defaults to `'throw'`, in which case any non-hex character in the input causes an error to be thrown. This matches the behaviour of `toHex()` on a `Uint8Array` (where supported).

`onInvalidInput` may otherwise be set to `'truncate'`, in which case decoding stops at the first non-hex character pair encountered. This matches the behaviour of `toString('hex')` on a Node `Buffer`.

Examples:

```javascript
import { fromHex } from 'hextreme';

fromHex('FEEDface');
// Uint8Array(4) [ 254, 237, 250, 206 ]

fromHex('FEEDfXce');
// Uncaught Error: Invalid pair in hex input at index 4

fromHex('FEEDfXce', { onInvalidInput: 'truncate' });
// Uint8Array(2) [ 254, 237 ]
```

### Base64 encoding

`toBase64(bytes: Uint8Array, { alphabet?: 'base64' | 'base64url', omitPadding?: boolean } = {}): string;`

Encodes binary data to a base64 string.

The `alphabet` option defaults to `'base64'`, but may alternatively be set to `'base64url'`, in which case the `+` and `/` characters are replaced with `-` and `_`.

The `omitPadding` option defaults to `false`, so that the output string is padded to a multiple of 4 characters using the `=` character. It can be set to `true` to prevent padding being applied.

Examples:

```javascript
import { toBase64 } from 'hextreme';

const bytes = new Uint8Array([133, 233, 101, 163, 255, 191, 194, 138, 229, 116]);

toBase64(bytes);
// 'hello/+/worldA=='

toBase64(bytes, { alphabet: 'base64url' });
// 'hello_-_worldA=='

toBase64(bytes, { alphabet: 'base64url', omitPadding: true });
// 'hello_-_worldA'
```

### Base64 decoding

`fromBase64(base64: string, { alphabet?: 'base64' | 'base64url', onInvalidInput?: 'throw' | 'skip' } = {}): Uint8Array;`

Decodes a base64 string to binary data. Whitespace in the input string (spaces, tabs, `\r` and `\n`) is ignored.

The `alphabet` option defaults to `'base64'`, but may alternatively be set to `'base64url'`, in which case the `+` and `/` characters are replaced with `-` and `_`.

The `onInvalidInput` option defaults to `'throw'`, in which case any non-base64, non-whitespace character in the input causes an error to be thrown. This matches the behaviour of `toBase64()` on a `Uint8Array` (where supported).

`onInvalidInput` may otherwise be set to `'skip'`, in which case any non-base64 characters are skipped and decoding continues. This matches the behaviour of `toString('base64')` on a Node `Buffer`.

_Note that decoding becomes substantially slower if whitespace or invalid characters are encountered in the input string._

Examples:

```javascript
import { fromBase64 } from 'hextreme';

fromBase64('hello/+/worldA==');
// Uint8Array(10) [ 133, 233, 101, 163, 255, 191, 194, 138, 229, 116 ]

fromBase64('hello/+/worldA');
// Uint8Array(10) [ 133, 233, 101, 163, 255, 191, 194, 138, 229, 116 ]

fromBase64('hello_-_worldA==', { alphabet: 'base64url' });
// Uint8Array(10) [ 133, 233, 101, 163, 255, 191, 194, 138, 229, 116 ]

fromBase64('hello/:+/worldA==');
// Uncaught Error: Invalid character in base64 at index 6

fromBase64('hello/:+/worldA==', { onInvalidInput: 'skip' });
// Uint8Array(10) [ 133, 233, 101, 163, 255, 191, 194, 138, 229, 116 ]
```

## Development

The source is in `src`. To build: `npm run build`.

To run tests: `npm run test`. To run a subset of tests on a big-endian platform (which has some different code paths), see [big-endian/README.md](big-endian/README.md).

To run benchmarks: `npm run perfCli` (for Node and Bun) and `npm run perfBrowser`.

## Licence

Copyright (C) 2024 George MacKerron and released under the [MIT License](LICENSE).
