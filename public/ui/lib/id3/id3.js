import { parse } from './id3Tag.js';
import { BrowserFileReader } from './browserFileReader.js';
import { RemoteReader } from './remoteReader.js';
const SUPPORTS_FILE = typeof window !== 'undefined' &&
    'File' in window &&
    'FileReader' in window &&
    typeof ArrayBuffer !== 'undefined';
/**
 * Parses ID3 tags from a given reader
 * @param {Reader} reader Reader to use
 * @return {Promise<ID3Tag>}
 */
export async function fromReader(reader) {
    await reader.open();
    const tags = await parse(reader);
    await reader.close();
    return tags;
}
/**
 * Parses ID3 tags from a local path
 * @param {string} path Path to file
 * @return {Promise<ID3Tag>}
 */
export async function fromPath(path) {
}
/**
 * Parses ID3 tags from a specified URL
 * @param {string} url URL to retrieve data from
 * @return {Promise<ID3Tag>}
 */
export function fromUrl(url) {
    return fromReader(new RemoteReader(url));
}
/**
 * Parses ID3 tags from a File instance
 * @param {File} file File to parse
 * @return {Promise<ID3Tag>}
 */
export function fromFile(file) {
    if (!SUPPORTS_FILE) {
        throw new Error('Browser does not have support for the File API and/or ' + 'ArrayBuffers');
    }
    return fromReader(new BrowserFileReader(file));
}
