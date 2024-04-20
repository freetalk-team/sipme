import { Reader } from './reader.js';
import * as fs from 'fs';
/**
 * Provides read access to the local file system
 */
export class LocalReader extends Reader {
    /**
     * @param {string} path Path of the local file
     */
    constructor(path) {
        super();
        this._path = path;
    }
    /** @inheritdoc */
    async open() {
        return new Promise((resolve, reject) => {
            fs.stat(this._path, (err, stat) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.size = stat.size;
                fs.open(this._path, 'r', (openErr, fd) => {
                    if (openErr) {
                        reject(err);
                        return;
                    }
                    this._fd = fd;
                    resolve();
                });
            });
        });
    }
    /** @inheritdoc */
    async close() {
        return new Promise((resolve, reject) => {
            if (this._fd === undefined) {
                reject(new Error('Resource not yet open'));
                return;
            }
            fs.close(this._fd, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /** @inheritdoc */
    async read(length, position) {
        const buffer = Buffer.alloc(length);
        return new Promise((resolve, reject) => {
            if (this._fd === undefined) {
                reject(new Error('Resource not yet open'));
                return;
            }
            fs.read(this._fd, buffer, 0, length, position, (err, _bytesRead, buffer) => {
                if (err) {
                    return reject(err);
                }
                const ab = new ArrayBuffer(buffer.length);
                const view = new Uint8Array(ab);
                for (let i = 0; i < buffer.length; i++) {
                    view[i] = buffer[i];
                }
                resolve(ab);
            });
        });
    }
}
