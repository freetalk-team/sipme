class FileWrapper {

	#file;
	#writer;
	#reader;
	#chunkLength;
	#dir;
	
	get start() { return this.#file._startPiece; }
	get end() { return this.#file._endPiece; }

	get length() { return this.#file.length; }
	get offset() { return this.#file.offset % this.#chunkLength; }
	get name() { return this.#file.name; }

	get chunkLength() { return this.#chunkLength; }
	get firstChunkLength() { return this.#chunkLength - this.offset; }
	get lastChunkLength() { return ((this.#file.offset + this.length) % this.#chunkLength) || this.#chunkLength; }

	get done() { return this.#file.done; }

	get size() { return this.#writer.length; }

	set dir(dir) { this.#dir = dir; }

	constructor(dir, file, chunkLength) {
		this.#dir = dir;
		this.#file = file;
		this.#chunkLength = chunkLength;
	}

	async load(dir) {
		const writer = await fs.writer(dir, this.name);

		// if (writer.length == this.length) {
		// 	this.#file.done = true;
		// }

		this.#writer = writer;
	}

	async read(pos, length) {
		if (!this.#reader) {
			this.#reader = await fs.reader(this.#dir, this.name);
		}

		return fs.read(this.#reader, pos, length);
	}

	async write(pos, data) {
		if (!this.#writer) {
			this.#writer = await fs.writer(this.#dir, this.name);

			if (this.#writer.length == 0)
				await fs.truncate(this.#writer, this.length);
		}

		// console.log('SEEK:', pos, this.length, data.length);
		this.#writer.seek(pos);
		
		return fs.write(this.#writer, data);
	}

	indexOf(index) { return index >= this.start && index <= this.end; }

	pos(index) {
		let i = index - this.start;
		// let pos = i == 0 ? 0 : (i - 1) * this.#chunkLength + this.offset;
		let pos = i * this.#chunkLength - Number(i > 0) * this.offset;

		return pos;
	}
}

class FileStorage extends FileWrapper {

	#next = null;
	#cache = [];
	#writing = false;

	set dir(dir) {
		super.dir = dir;
		if (this.#next)
			this.#next.dir = dir;
	}

	get lastPieceIndex() { return this.#next ? this.#next.lastPieceIndex : this.end; }

	constructor (files, chunkLength) {
		const file = files.shift();

		super (null, file, chunkLength);

		if (files.length > 0)
			this.#next = new FileStorage(files, chunkLength);
	}

	put(index, data) {
		if (index > this.end) 
			return this.#next.put(index, data);

		// todo check if last index
		if (index == this.end) {
			const len = this.lastChunkLength;

			if (len < this.chunkLength && this.#next) {

				const rest = data.slice(len);
				this.#next.put(index, rest);

				data = data.slice(0, len);
			}
		}

		this.#put(index, data);
		this.#write();
	}

	async get(index, opt) {
		if (index > this.end) 
			return this.#next.get(index, opt);

		const pos = this.pos(index);

		if (index == this.end) {

			const len = this.lastChunkLength;
			let buf = await this.read(pos, len);

			if (len < this.chunkLength && this.#next) {
				const b1 = buf;
				const b2 = await this.#next.read(0, this.chunkLength - len);

				buf = new Uint8Array(b1.length + b2.length);
				buf.set(b1);
				buf.set(b2, b1.length);
			}

			return buf;
		}

		return this.read(pos, this.chunkLength);
	}

	#put(index, data) {
		// todo

		// if (this.#cache.length > 0 && this.#cache[0][0] - index > ) {
			
		// }

		for (const i of this.#cache) {

			if (index == i.range[0] - 1) {
				i.range[0]--;
				i.data.unshift(data);
				return;
			}

			if (i.range[1] + 1 == index) {
				i.range[1]++;
				i.data.push(data);
				return;
			}

		}

		this.#cache.push({ range: [ index, index], data: [data] });
	}

	async #write() {

		if (this.#writing)
			return;

		this.#writing = true;

		while (this.#cache.length > 0) {

			const b = this.#cache.shift();
			const pos = this.pos(b.range[0]);
			
			await this.write(pos, b.data);
		}

		this.#writing = false;
	}
}

export { 
	FileStorage
}