export declare function _toHex(d: Uint8Array | number[], scratchArr: Uint16Array): string;
export declare function _toHexChunked(d: Uint8Array): string;
export declare function toHex(d: Uint8Array): any;
export declare function _fromHex(s: string, lax?: boolean, outArr?: Uint8Array, scratchArr?: Uint16Array, indexOffset?: number): Uint8Array<ArrayBuffer>;
export declare function _fromHexChunked(s: string, lax?: boolean): Uint8Array<ArrayBuffer>;
export declare function fromHex(s: string, lax?: boolean): any;
