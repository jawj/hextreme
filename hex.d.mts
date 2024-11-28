export interface FromHexOptions {
    onInvalidInput?: 'throw' | 'truncate';
}
export interface _FromHexOptions extends FromHexOptions {
    scratchArr?: Uint16Array;
    outArr?: Uint8Array;
    indexOffset?: number;
}
export interface ToHexOptions {
    alphabet?: 'lower' | 'upper';
}
export interface _ToHexOptions extends ToHexOptions {
    scratchArr?: Uint16Array;
}
export declare function _toHex(d: Uint8Array | number[], { alphabet, scratchArr }?: _ToHexOptions): string;
export declare function _toHexChunked(d: Uint8Array, options?: ToHexOptions): string;
export declare function toHex(d: Uint8Array, options?: ToHexOptions): any;
export declare function _fromHex(s: string, { onInvalidInput, scratchArr, outArr, indexOffset }?: _FromHexOptions): Uint8Array<ArrayBuffer>;
export declare function _fromHexChunked(s: string, { onInvalidInput }?: FromHexOptions): Uint8Array<ArrayBuffer>;
export declare function fromHex(s: string, options?: FromHexOptions): any;
