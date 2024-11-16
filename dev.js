const
  c = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102],  // 0123456789abcdef
  C = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 65, 66, 67, 68, 69, 70],     // 0123456789ABCDEF
  lo = (48 << 8) | 48,    // 00
  hi = (102 << 8) | 102;  // ff

console.log('switch (x) {');
// littleEndian
for (let i = 0; i < 256; i++) {
  const
    clo = c[i & 0xF] << 8,
    Clo = C[i & 0xF] << 8,
    chi = c[i >>> 4],
    Chi = C[i >>> 4],
    values = [clo | chi, Clo | chi, clo | Chi, Clo | Chi].sort((a, b) => a - b).filter((x, i, arr) => x !== arr[i - 1]);
  
  let s = '  ';
  for (let v of values) s += `case ${v}: `;
  s += `out[i] = ${i}; continue;`
  console.log(s);
}
console.log('}');

// else for (let i = 0; i < 256; i++) {
//   const
//     clo = c[i & 0xF],
//     Clo = C[i & 0xF],
//     chi = c[i >>> 4] << 8,
//     Chi = C[i >>> 4] << 8;

//   hl[(clo | chi)] =
//     hl[(Clo | chi)] =
//     hl[(clo | Chi)] =
//     hl[(Clo | Chi)] = i;
// }
