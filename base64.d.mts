export interface Base64Options {
    alphabet?: 'base64' | 'base64url';
}
export interface FromBase64Options extends Base64Options {
    onInvalidInput?: 'throw' | 'skip';
}
export interface _FromBase64Options extends FromBase64Options {
    scratchArr?: Uint32Array;
    outArr?: Uint8Array;
}
export interface ToBase64Options extends Base64Options {
    omitPadding?: boolean;
}
export interface _ToBase64Options extends ToBase64Options {
    scratchArr?: Uint32Array;
}
export declare function _toBase64(d: Uint8Array, { omitPadding, alphabet, scratchArr }?: _ToBase64Options): string;
export declare function _toBase64Chunked(d: Uint8Array, options?: ToBase64Options): string;
export declare function toBase64(d: Uint8Array, options?: ToBase64Options): any;
export declare function fromBase64(s: string, { alphabet, onInvalidInput, scratchArr, outArr }?: _FromBase64Options): Uint8Array<ArrayBuffer>;
