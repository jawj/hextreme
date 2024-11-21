import {
  fromHex,
  _toHexInChunksUsingTextDecoder,
  toBase64,
} from '../index.mjs';


// this is a highly incomplete shim, but works here
TextEncoder.prototype.encodeInto = function (s, arr) {
  const newArr = this.encode(s);
  arr.set(newArr);
  return {};  // should be { read, written }
}

function err(s) {  // qjs just quits on error
  console.log(s);
  throw new Error(s);
}

function basicToHex(arr) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0, len = arr.length; i < len; i++) {
    const c = arr[i];
    out += chars.charAt(c >>> 4) + chars.charAt(c & 15);
  }
  return out;
}

function basicToBase64(input, pad, urlsafe) {
  const chars = urlsafe ?
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=" :
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

  let
    output = '',
    i = 0,
    chr1, chr2, chr3, enc1, enc2, enc3, enc4;

  while (i < input.length) {
    chr1 = input[i++];
    chr2 = input[i++];
    chr3 = input[i++];

    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;

    if (isNaN(chr2)) enc3 = enc4 = pad ? 64 : 65;
    else if (isNaN(chr3)) enc4 = pad ? 64 : 65;

    output = output +
      chars.charAt(enc1) + chars.charAt(enc2) +
      chars.charAt(enc3) + chars.charAt(enc4);
  }
  return output;
}


console.log('Generating random test data ...');

const
  lengths = [...new Array(102).fill(0).map((_, i) => i), 1010, 10101, 101010],
  arrays = lengths.map(length => {
    const arr = new Uint8Array(length);
    for (let i = 0; i < length; i++) arr[i] = Math.random() * 256 >> 0;
    return arr;
  });

console.log('Generated\n');


console.log('Encoding as base64 ...');

const
  goodBase64 = arrays.map(arr => basicToBase64(arr, true, false)),
  testBase64 = arrays.map(arr => toBase64(arr, true, false));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (testBase64[i] !== goodBase64[i]) err(`base64 mismatch for array length ${lengths[i]}: '${testBase64[i]}' !== '${goodBase64[i]}'`);
}

console.log('Tests passed\n');


console.log('Encoding as base64url ...');

const
  goodBase64Url = arrays.map(arr => basicToBase64(arr, false, true)),
  testBase64Url = arrays.map(arr => toBase64(arr, false, true));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (testBase64Url[i] !== goodBase64Url[i]) err(`base64 mismatch for array length ${lengths[i]}: '${testBase64Url[i]}' !== '${goodBase64Url[i]}'`);
}

console.log('Tests passed\n');


console.log('Encoding as hex ...');

const
  goodHex = arrays.map(arr => basicToHex(arr)),
  testHex = arrays.map(arr => _toHexInChunksUsingTextDecoder(arr));

console.log('Checking results ...');

for (let i = 0; i < arrays.length; i++) {
  if (goodHex[i] !== testHex[i]) err(`Hex mismatch for array length ${lengths[i]}`);
}

console.log('Tests passed\n');


console.log('Decoding back from hex and checking results ...');

for (let i = 0; i < arrays.length; i++) {
  const
    data = arrays[i],
    hex = goodHex[i],
    dataAgain = fromHex(hex);

  if (dataAgain.length !== data.length) err(`Length mismatch`);
  for (let j = 0; j < data.length; j++) {
    if (data[j] !== dataAgain[j]) err(`Value mismatch: ${data} != ${dataAgain}`);
  }
}

console.log('Tests passed\n');


console.log('Decoding hex with invalid characters ...');

function expectError(hex) {
  let caughtErr = null;
  try {
    fromHex(hex)
  } catch (e) {
    caughtErr = e
  } finally {
    if (!caughtErr) err(`Should have caught error: ${hex}`);
    else console.log(`As expected -- ${caughtErr}`);
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

console.log('Tests passed\n');
