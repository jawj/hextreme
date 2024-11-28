export declare function _toBase64(d: Uint8Array, pad?: boolean, urlsafe?: boolean, scratchArr?: Uint32Array): string;
export declare function _toBase64Chunked(d: Uint8Array, pad?: boolean, urlsafe?: boolean): string;
export declare function toBase64(d: Uint8Array, pad?: boolean, urlsafe?: 'boolean'): any;
export declare function fromBase64(s: string, urlsafe?: boolean, lax?: boolean, scratchArr?: Uint32Array, outArr?: Uint8Array): Uint8Array<ArrayBuffer>;
