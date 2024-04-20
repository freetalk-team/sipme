
// const console = createConsole({ label: 'RUNNER', time: true });

const kDefault = { interval: 30, log: false };
const kDay = 24 * 60 * 60;
const kInterval = 5, kStartHour = 6, kDuration = 14;

class Runner {

	#queue = [];
	#interval;
	#opt;
	#suspended = false;

	get interval() { return this.#opt.interval; }
	set interval(i) { this.#opt.interval = i; }

	constructor(opt=kDefault) {
		this.#opt = Object.assign({}, kDefault, opt);
	}

	setTimeout(seconds, callback, repeat=false, offset=seconds, name='') {

		// console.debug('####### Creating task:', seconds, repeat);

		const cb = this.createTask(callback, name);

		if (repeat)
			cb.interval = seconds;

		this.push(offset, cb);

		if (!this.#suspended)
			this.#start();

		return cb;
	}	

	suspend() {
		this.#suspended = true;
		this.#stop();
	}

	resume() {
		this.#suspended = false;
		if (this.#queue.length > 0)
			this.#start();
	}

	reset() {
		console.debug('Runner RESET');
		this.#stop();
		this.#queue = [];
		this.#suspended = false;
		this.#start();
	}

	execute() { 
		return this.#execute(); 
	}

	setInterval(seconds) {

		const N = this.interval;

		if (seconds == N) return;


		const queue = [];
		const items = getTasks(this.#queue);

		// console.debug('Runner reseting interval:', N, '=>', seconds, 'items=', items.map(i => i[0]));

		// scale up
		if (seconds < N) {

			const r = Math.floor(N / seconds);

			// console.debug('Scalling queue UP', r, items);

			for (const [index, value] of items)
				queue[index * r] = value;
		}

		// scale down
		else {

			let r = Math.floor(seconds / N);

			// console.debug('Scalling queue DOWN', r, items);

			let j;
			for (const [index, value] of items) {
				j = Math.floor(index / r);
				// console.debug('New index =>', j);
				queue[j] = value;
			}
		}

		// console.debug('Runner queue scale:', getTasks(queue).map(i => i[0]));

		this.interval = seconds;
		this.#queue = queue;

		this.#restart();
	}

	createTask(...args) { 
		return Runner.createTask(...args); 
	}

	checkStop() {
		if (this.#queue.length == 0) {
			// console.debug('EXECUTE: queue is empty !');
			this.#stop();
		}
	}

	push(seconds, cb) {

		// console.debug('RUNNER pushing task:', cb.id, cb.interval);

		let i = Math.round(seconds / this.#opt.interval);
		if (i > 0) --i;

		// console.debug('Calculated pos:', seconds, this.#opt.interval, i);

		let callbacks = this.#queue[i];
		if (callbacks) callbacks.add(cb);
		else this.#queue[i] = new Set([ cb ]);

		cb.queue = this.#queue[i];

		// console.debug('PUSH => ', seconds, getTasks(this.#queue).map(i => [i[0], i[1].size]));
	}

	shift() {
		return this.#queue.shift();
	}

	#start() {
		if (this.#interval) return;

		const i = this.interval;

		// console.debug('Starting runner:', i);
		this.#interval = setInterval(() => this.execute() , i * 1000);
	}

	#stop() {
		if (!this.#interval) return;

		// console.debug('Stopping runner:', this.interval);
		clearInterval(this.#interval);
		this.#interval = undefined;
	}

	#restart() {
		if (!this.#suspended) {
			console.debug('Runner restart:', this.interval);
			this.#stop();
			this.#start();
		}
	}

	#execute() {

		// console.debug('#### EXECUTE BEGIN ####');

		// if (this.#queue.length == 0)
		// 	this.#stop();

		// if (this.#opt.log)
		// 	console.debug('Executing runner');


		// console.debug('# Runner before execute:', getTasks(this.#queue).map(i => i[0]));
		const tasks = this.#queue.shift();

		// console.debug('#### T', tasks);

		if (tasks) {
			// console.debug('Executing taksk:', tasks.size);

			for (const i of tasks) {

				// console.debug('\ttask:', i.interval);

				if (i.interval)
					this.push(i.interval, i);

				i.execute(false);
			}
		}

		// console.debug('## Runner after execute:', getTasks(this.#queue).map(i => i[0]));

		this.checkStop();

		// console.debug('#### EXECUTE END ####\n');
	}

	

	static createTask(callback, name) {
		return {
			name, 
			callback,

			cancel() {
				// console.debug('Task cancel:', this.interval);
				this.queue.delete(this);
			},

			execute(force=true) {

				console.debug(Date.formatTimeDate(), 'Task execute ...', this.name);

				if (force) {
					this.forced = true;
					return this.callback(this);
				}

				if (!this.forced) 
					return this.callback(this);
				
				
				delete this.forced;
			},

			skipNext() {
				this.forced = true;
			}
		};

		//return new Task(callback);
	}
}

class TaskRunner extends Runner {

	#intervals;
	#tasks;

	constructor(intervals=[30*60, 10*60, 60]) {
		intervals.sort((a, b) => b - a);
		super({ interval: intervals[intervals.length - 1] });

		this.#intervals = intervals;
		this.#tasks = intervals.map(i => 0);

		console.debug('Task runner:', this.#intervals);
	}

	setTimeout(seconds, ...args) {

		// console.debug('# Task runner new task', seconds);

		const intervals = this.#intervals;

		let interval, index;

		for (let i = 0; i < intervals.length - 1; ++i) {

			const n = intervals[i]

			if (seconds >= n) {


				let r = seconds / n;

				r -= Math.floor(r);

				// console.debug('Found runner:', seconds, n, i, r);

				if (r > 0.9 || r < 0.1) {
					interval = n;
					index = i;
					break;
				}
			} 

		}

		if (!interval) {
			index = intervals.length - 1;
			interval = intervals[index];
		}

		// console.debug('Adding task', interval, index, this.#tasks);

		if (++this.#tasks[index] == 1) {

			let reset = true;
			for (let i = index + 1; i < this.#tasks.length; ++i) {
				if (this.#tasks[i] > 0) {
					reset = false;
					break;
				}
			}

			if (reset || interval < this.interval)
				this.setInterval(interval);
		}

		const task = super.setTimeout(seconds, ...args);

		task._index = index;
		task.cancel = () => {
			task.queue.delete(task);
			task.interval = 0;

			const count = --this.#tasks[index];
			// console.debug('Task runner cancel task', index, count, this.#tasks);

			if (count == 0) {

				for (let i = index - 1; i >= 0; --i) {
					if (this.#tasks[i] > 0) {
						this.setInterval(this.#intervals[i]);
						break;
					}
				}
			}
		}

		return task;
	}

	async execute() {
		const tasks = this.shift();

		// console.debug('#### T', tasks);

		if (tasks) {
			// console.debug('TaskRunner executing taksk:', tasks.size);

			let r, promises = [];

			for (const i of tasks) {

				// console.debug('\ttask:', i.interval);

				r = i.execute(false);

				if (isPromise(r)) {
					promises.push(r);
					r.then(() => this.checkPush(i));
				}
				else {
					this.checkPush(i);
				}
			}

			if (promises.length > 0)
				await Promise.all(promises);
		}

		this.checkStop();
	}

	checkPush(task) {
		if (task.interval) 
			super.push(task.interval, task);
		
	}

	createDailyRunner(gmt=0, kInterval=5, kStartHour=6, kDuration=14) {
		return new DailyRunner(this, gmt, kInterval, kStartHour, kDuration);
	}

	createDailyRunner2(gmt=0) {
		return new DailyRunner2(this, gmt);
	}
}

class DailyRunner {

	#task;
	#tasks = [];
	#start;
	#end;
	#iteration = 1;
	#interval = 1;

	constructor(runner, gmt, kInterval, kStartHour, kDuration) {
		const now = Date.seconds();
		const [start, end] = calcStartEnd(gmt, now);

		this.#interval = kInterval;

		console.log(Date.formatTimeDate(now), 'Starting daily runner in', Math.floor(start / 60), 'mins');

		this.#start = runner.setTimeout(kDay, () => {

			this.#task = runner.setTimeout(kInterval * 60, () => this.#execute(), true);

		}, true, start);

		this.#end = runner.setTimeout(kDay, () => this.#task.cancel(), true, end);
	}

	setInterval(min, cb) {

		const i = Math.ceil(min / this.#interval) - 1;

		console.debug('Setting interval:', min, i);

		if (this.#tasks[i])
			this.#tasks[i].push(cb);
		else
			this.#tasks[i] = [cb];

		//console.debug(this.#tasks[i]);
	}

	#execute() {

		const now = new Date;
		console.debug(now.formatTimeDate(), 'Executing daily runner');
		// console.debug(this.#tasks);


		const callbacks = [];

		for (let i = 0; i < this.#tasks.length; ++i) {

			if (this.#iteration % (i + 1))
				continue;

			const tasks = this.#tasks[i];
			if (tasks)
				callbacks.push(...tasks);
		}

		++this.#iteration;

		if (callbacks.length > 0)
			callTasks(callbacks);
	}

}

class DailyRunner2 {

	#runner;
	#queue = [];
	#tasks = [];

	#running = false;
	#starting;
	
	constructor(runner, gmt) {

		const [start, end, now] = calcStartEnd2(gmt);

		runner.setTimeout(kDay, () => this.#startTasks(), true, start, 'Daily start task');
		runner.setTimeout(kDay, () => this.#stopTasks(), true, end, 'Daily stop task');

		this.#runner = runner;

		console.debug('Daily runner', start, end, now);

		if (now) 
			this.#startTasks();
	}

	setInterval(interval, cb, startImmediately=false, name='') {
		// interval *= 60;

		this.#queue.push({ interval, cb });
		
		if (this.#running)
			this.#startTask(interval, cb, startImmediately, name);
	}

	#startTasks() {

		this.#starting = [...this.#queue];
		this.#running = true;

		console.debug('Starting tasks:', this.#starting.length);

		this.#runner.setTimeout(20, (startTask) => {

			const executor = this.#starting.shift();
			if (!executor) {
				console.debug('Canceling start task');
				startTask.cancel();
				return;
			}

			this.#startTask(executor.interval, executor.cb);

		}, true, 0, 'Starter Task');

	}

	#stopTasks() {
		for (const i of this.#tasks)
			i.cancel();

		this.#running = false;
		this.#tasks = [];
	}

	#startTask(interval, cb, now=true, name='') {

		const delay = now ? 0 : Math.ceil(interval * 0.2 * Math.random());

		console.debug('START task delay', name, delay);

		const task = this.#runner.setTimeout(interval, cb, true, delay, name);
		this.#tasks.push(task);
	}

}

function getTasks(queue) {
	return Array.from(queue.entries()).filter(i => i[1] != undefined && i[1].size > 0);
}

function callTasks(callbacks) {
	// for (const cb of callbacks)
	// 	cb();

	console.debug('TASK call:', callbacks);
	
	const cb = callbacks.shift();

	if (typeof cb != 'function') console.debug('###>> ', cb);

	cb();

	if (callbacks.length > 0) {

		const timeout = setInterval(() => {

			const cb = callbacks.shift();

			cb();

			if (callbacks.length == 0)
				clearInterval(timeout);

		}, 2000);
	}
}

function calcStartEnd(gmt, now=Date.seconds()) {

	const today = Math.floor(now / kDay) * kDay;
	let start = today + (kStartHour - gmt) * 3600;
	let end = today + (kStartHour + kDuration - gmt) * 3600;

	// console.debug('# ', now, start, end);

	if (now >= start) {

		if (now < end) {


			start = 0;
			end -= now;
		}
		else {
			start = start + kDay - now;
			end = start + kDuration * 3600;
		}
	}
	else {
		start -= now;
		end -= now;
	}

	return [start, end];
}

function calcStartEnd2(gmt, now=Date.seconds()) {

	const today = Math.floor(now / kDay) * kDay;
	let start = today + (kStartHour - gmt) * 3600;
	let end = today + (kStartHour + kDuration - gmt) * 3600;

	let startNow = false;


	// console.debug('# ', now, start, end);

	if (now >= start) {

		start = start + kDay - now;

		if (now < end) {
			startNow = true;
			end -= now;
		}
		else {
			end = start + kDuration * 3600;
		}
	}
	else {
		start -= now;
		end -= now;
	}

	return [start, end, startNow];
}

export { 
	Runner,
	TaskRunner
}

// class Task {

// 	static _id = 1;

// 	#interval;
// 	#callback;
// 	#forced;
// 	#queue;
// 	#id = Task._id++;

// 	get interval() { return this.#interval; }
// 	set interval(i) { 
// 		console.log('## Setting task interval:', this.id, i);
// 		this.#interval = i; 
// 	}

// 	set queue(q) { this.#queue = q; }

// 	get id() { return this.#id; }

// 	constructor(cb) { 
// 		this.#callback = cb;

// 		console.log('## Creating task:', this.#id);
// 	}

// 	execute(forced=true) {

// 		if (forced) {
// 			this.#callback(this);
// 			this.#forced = true;
// 		}
// 		else if (!this.#forced) {
// 			this.#callback(this);
// 		}
// 		else {
// 			this.#forced = false;
// 		}
// 	}

// 	cancel() {
// 		this.#queue.delete(this);
// 	}


// }