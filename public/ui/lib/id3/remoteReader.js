import { Reader } from './reader.js';
/**
 * Reads a remote URL
 */
export class RemoteReader extends Reader {
    /**
     * @param {string} url URL to retrieve
     */
    constructor(url) {
        super();
        this._url = url;
    }
    /** @inheritdoc */
    async open() {
        const resp = await fetch(this._url, {
            method: 'HEAD'
        });
        const contentLength = resp.headers.get('Content-Length');
        this.size = contentLength ? Number(contentLength) : 0;
    }
    /** @inheritdoc */
    async read(length, position) {
        const resp = await fetch(this._url, {
            method: 'GET',
            headers: {
                Range: `bytes=${position}-${position + length - 1}`
            }
        });
        return await resp.arrayBuffer();
    }
}
