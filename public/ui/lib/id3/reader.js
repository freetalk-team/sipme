/**
 * Provides read access to a given resource
 */
export class Reader {
    constructor() {
        /**
         * Size of the resource
         */
        this.size = 0;
    }
    /**
     * Closes the resource
     * @return {Promise<void>}
     */
    async close() {
        return;
    }
    /**
     * Reads a specified range into a Blob
     * @param {number} length Number of bytes to read
     * @param {number} position Position to begin from
     * @param {string=} type Type of data to return
     * @return {Promise<Blob>}
     */
    async readBlob(length, position = 0, type = 'application/octet-stream') {
        const data = await this.read(length, position);
        return new Blob([data], { type: type });
    }
}
