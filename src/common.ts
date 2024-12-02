export interface Base64Options {
  alphabet?: 'base64' | 'base64url';
}

export const
  chunkBytes = 1_008_000,  // must be divisible by 24; temporary buffer allocations (in bytes) are up to this value
  littleEndian = new Uint8Array((new Uint16Array([0x0102]).buffer))[0] === 0x02,
  td = new TextDecoder(),
  te = new TextEncoder(),
  hexCharsLower = te.encode('0123456789abcdef'),
  hexCharsUpper = te.encode('0123456789ABCDEF'),
  b64ChStd = te.encode('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'),
  b64ChPad = 61,  // =
  b64ChUrl = b64ChStd.slice();

b64ChUrl[62] = 45;  // -
b64ChUrl[63] = 95;  // _
