import { Reader } from './reader.js';
/**
 * Reads a `File` instance
 */
export class BrowserFileReader extends Reader {
    /**
     * @param {File} file File to read
     */
    constructor(file) {
        super();
        this._file = file;
    }
    /** @inheritdoc */
    async open() {
        this.size = this._file.size;
    }
    /** @inheritdoc */
    async read(length, position) {
        const slice = this._file.slice(position, position + length);
        return new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => {
                resolve(fr.result);
            };
            fr.onerror = () => {
                reject(new Error('File read failed'));
            };
            fr.readAsArrayBuffer(slice);
        });
    }
}
