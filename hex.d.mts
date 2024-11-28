export declare function _toHex(d: Uint8Array | number[], scratchArr: Uint16Array): string;
export declare function _toHexChunked(d: Uint8Array): string;
export declare function toHex(d: Uint8Array): any;
export interface FromHexOptions {
    onInvalidInput?: 'throw' | 'truncate';
}
export interface _FromHexOptions extends FromHexOptions {
    scratchArr?: Uint16Array;
    outArr?: Uint8Array;
    indexOffset?: number;
}
export declare function _fromHex(s: string, { onInvalidInput, scratchArr, outArr, indexOffset }?: _FromHexOptions): Uint8Array<ArrayBuffer>;
export declare function _fromHexChunked(s: string, { onInvalidInput }?: FromHexOptions): Uint8Array<ArrayBuffer>;
export declare function fromHex(s: string, lax?: boolean): any;
