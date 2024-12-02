export interface Base64Options {
  alphabet?: 'base64' | 'base64url';
}

export const
  chunkBytes = 1008000,  // must be divisible by 24; temporary buffer allocations (in bytes) are up to this value
  littleEndian = new Uint8Array((new Uint16Array([0x0102]).buffer))[0] === 0x02,
  hexCharsLower = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102],  // 0123456789abcdef
  hexCharsUpper = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70],  // 0123456789ABCDEF
  b64ChStd = new Uint8Array([  // ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/
    65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88,
    89, 90, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114,
    115, 116, 117, 118, 119, 120, 121, 122, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 43, 47
  ]),
  b64ChPad = 61,  // =
  b64ChUrl = b64ChStd.slice();

b64ChUrl[62] = 45;  // -
b64ChUrl[63] = 95;  // _
