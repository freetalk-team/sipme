
// require('../../../gui/public/common/utils/string');
// require('../../../gui/public/common/utils/object');

const kDefaultWidth = 480;
const kDefaultHeight = 360;
const kMarginX = 10;

// Render the svg <path> element 
// I:  - points (array): points coordinates
//     - command (function)
//       I:  - point (array) [x,y]: current point coordinates
//           - i (integer): index of 'point' in the array 'a'
//           - a (array): complete array of points coordinates
//       O:  - (string) a svg path command
// O:  - (string): a Svg <path> element
const svgPath = (points, command) => {
	// build the d attributes by looping over the points
	const d = points.reduce((acc, point, i, a) => i === 0
	  // if first point
	  ? `M ${point[0]},${point[1]}`
	  // else
	  : `${acc} ${command(point, i, a)}`
	, '')
	return d;
	// return `<path d="${d}" class="ct-line" />`
	// return `<path d="${d}" fill="none" stroke="grey" />`
  }

// Svg path line command
// I:  - point (array) [x, y]: coordinates
// O:  - (string) 'L x,y': svg line command
const lineCommand = point => `L ${point[0]} ${point[1]}`

// Properties of a line 
// I:  - pointA (array) [x,y]: coordinates
//     - pointB (array) [x,y]: coordinates
// O:  - (object) { length: l, angle: a }: properties of the line
const line = (pointA, pointB) => {
	const lengthX = pointB[0] - pointA[0]
	const lengthY = pointB[1] - pointA[1]
	return {
	  length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
	  angle: Math.atan2(lengthY, lengthX)
	}
}

// Position of a control point 
// I:  - current (array) [x, y]: current point coordinates
//     - previous (array) [x, y]: previous point coordinates
//     - next (array) [x, y]: next point coordinates
//     - reverse (boolean, optional): sets the direction
// O:  - (array) [x,y]: a tuple of coordinates
const controlPoint = (current, previous, next, reverse) => {
	// When 'current' is the first or last point of the array
	// 'previous' or 'next' don't exist.
	// Replace with 'current'
	const p = previous || current
	const n = next || current
	// The smoothing ratio
	const smoothing = 0.2
	// Properties of the opposed-line
	const o = line(p, n)
	// If is end-control-point, add PI to the angle to go backward
	const angle = o.angle + (reverse ? Math.PI : 0)
	const length = o.length * smoothing
	// The control point position is relative to the current point
	const x = current[0] + Math.cos(angle) * length
	const y = current[1] + Math.sin(angle) * length
	return [x, y]
  }

// Create a function to calculate the position of the control point
// I:  - lineCalc (function) 
//       I:  - pointA (array) [x, y]: coordinates
//           - pointB (array) [x, y]: coordinates 
//       O:  - (object) { length: (integer), angle: (integer) }
//     - smooth (float)
// O:  - (function) closure
//       I:  - current (array) [x, y]: coordinates
//           - previous (array) [x, y]: coordinates
//           - next (array) [x, y]: coordinates
//           - reverse (boolean, optional): sets the direction
//       O:  - (array) [x,y]: coordinates
const controlPointClosure = (lineCalc, smooth) => (current, previous, next, reverse) => {
  
	// when 'current' is the first or last point of the array
	// 'previous' and 'next' are undefined 
	// replace with 'current'
	const p = previous || current
	const n = next || current
	// properties of the line between previous and next 
	const l = lineCalc(p, n)
	// If is end-control-point, add PI to the angle to go backward
	const angle = l.angle + (reverse ? Math.PI : 0)
	const length = l.length * smooth
	// The control point position is relative to the current point
	const x = current[0] + Math.cos(angle) * length
	const y = current[1] + Math.sin(angle) * length
	return [x, y]
  }

// Create the bezier curve command 
// I:  - point (array) [x,y]: current point coordinates
//     - i (integer): index of 'point' in the array 'a'
//     - a (array): complete array of points coordinates
// O:  - (string) 'C x2,y2 x1,y1 x,y': SVG cubic bezier C command
const bezierCommand = (point, i, a) => {
	// start control point
	const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point)
	// end control point
	const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true)
	return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`
  }

// Create a function to calculate a bezier curve command 
// I:  - controlPointCalc (function)
//       I:  - current (array) [x, y]: current point coordinates
//           - previous (array) [x, y]: previous point coordinates
//           - next (array) [x, y]: next point coordinates
//           - reverse (boolean) to set the direction
//       O:  - (array) [x, y]: coordinates of a control point
// O:  - (function) closure
//       I:  - point (array) [x,y]: current point coordinates
//           - i (integer): index of 'point' in the array 'a'
//           - a (array): complete array of points coordinates
//       O:  - (string) 'C x2,y2 x1,y1 x,y': cubic bezier command
const bezierCommandClosure = controlPointCalc => (point, i, a) => {
	// start control point
	const [cpsX, cpsY] = controlPointCalc(a[i-1], a[i-2], point)
	// end control point
	const [cpeX, cpeY] = controlPointCalc(point, a[i-1], a[i+1], true)
	return `C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`
  }

  const smoothing = 0.2
// Position of a control point
// I:  - current (array) [x, y]: coordinates
//     - previous (array) [x, y]: coordinates
//     - next (array) [x, y]: coordinates
//     - reverse (boolean, optional): sets the direction
// O:  - (array) [x, y]: coordinates of a control point
const controlPointCalc = controlPointClosure(line, smoothing);
// Bezier curve command
// I:  - point (array) [x,y]: current point coordinates
//     - i (integer): index of 'point' in the array 'a'
//     - a (array): complete array of points coordinates
// O:  - (string) 'C x2,y2 x1,y1 x,y': cubic bezier command
const bezierCommandCalc = bezierCommandClosure(controlPointCalc)


// const points = [[5, 10], [10, 40], [40, 30], [60, 5], [90, 45], [120, 10], [150, 45], [200, 10]];
// console.log(svgPath(points, bezierCommandCalc));

function calcPoints(labels, values, min, max, width, height) {
	const N = labels.length;

	const dx = width;
	const stepX = Math.floor(dx / N);

	// if (!min) min = values.min();
	// if (!max) max = values.max();

	const d = max - min;
	const dy = height;

	const r = height / d;

	const points = [];

	console.debug('Values:', min, max);

	let y;

	for (let x = 0, i = 0; i < labels.length; ++i, x += stepX) {

		y = dy - (values[i] - min) * r;

		points.push([x, y]);

	}

	return points;
}

function calcGridPoints(labels, min, max, step, width, height) {


	const d = max - min;
	const r = height / d;

	const lines = Math.ceil(d / step) + 1;

	const grid = [];
	// const y = [minValue];
	// while ((i = y[y.length - 1]) + scale < maxValue) y.push(i + scale);
	
	const N = labels.length;

	const stepX = Math.floor(width / N);
	for (let x = 0, i = 0; i < labels.length; ++i, x += stepX) {
		// vertical
		grid.push({ x1: x, x2: x, y1: 0, y2: height });
	}

	// for (let v = min, i = 0; v < max + step; v += step, ++i) {
	for (let v = min, i = 0; i < lines; v += step, ++i) {
		const y = height - i * step * r;
		grid.push({ x1: 0, x2: width, y1: y, y2: y });
	}

	console.debug('GRID points:', grid);

	return grid;
}

// const labels = ['1', '2', '3', '4', '5', '6', '7'];

// const s1 = [ 10, 50, 80, 40, 30, 20, 10];
// const series = [s1];

// const grid = calcGridPoints(labels, series);
// console.log(grid);

// const points = calcPoints(labels, s1);
// console.log(points);

// const path = svgPath(points, bezierCommandCalc);
// console.log(path);

const defaultOptions = {
	width: 400,
	// width: 480,
	// height: 360,

	marginX: 10,
	marginY: 15,

	maxLinesY: 10
};

const chart = {

	create(labels, series, template, opt={...defaultOptions}) {

		if (!opt.height)
			opt.height = (opt.width * 3) / 4;

		const { width, height, marginX, marginY, /*maxLinesY*/ } = opt;

		const kMarginLeft = 16;
		const kMarginBottom = 22;

		const w = width - 2*marginX - kMarginLeft;
		const h = height - 2*marginY - kMarginBottom;

		const x0 = marginX + kMarginLeft;
		const y0 = marginY;

		let min, max;

		const mins = series.map(s => s.min());
		const maxs = series.map(s => s.max());

		min = mins.min();
		max = maxs.max();

		const maxLinesY = 10;

		let d = max - min;
		const scale = [1,2,5,10,25,50,100,200,500,1000];

		let i = 0;
		for (; maxLinesY * scale[i] < d; ++i);

		if (d / scale[i] > maxLinesY) i++;

		const f = scale[i];
		const s = scale[i] * 10;

		// min = Math.floor(min / s) * s;
		// max = Math.ceil(max / s) * s + f;
		max += f - (max % f);
		min -= min % f;

		// if (min - f > 0) min -= f;

		// d = max - min;


		const grid = calcGridPoints(labels, min, max, f, w, h);
		grid.map(i => (i.x1 += x0, i.x2 += x0, i.y1 += y0, i.y2 += y0));

		const points = series.map(i => calcPoints(labels, i, min, max, w, h));
		points.map(i => i.map(p => (p[0] += x0, p[1] += y0)));

		// for (const s of points) {
		// 	for (const p of s) {
		// 		p[0] = x0 + p[0];
		// 		p[1] = y0 + p[1];
		// 	}
		// }

		points.map(i => i.path = svgPath(i, bezierCommandCalc));

		const values = [];
		for (let i = min; i <= max; i += f) values.push(i);

		const stepY = h / (values.length - 1);

		const data = {
			width, height,
			labels, series,
			grid, points,
			values,

			labelX: {
				start: x0,
				step: w / labels.length,
				Y: height - kMarginBottom
			},
			labelY: {
				start: height - kMarginBottom - y0,
				step: -stepY,
				X: -kMarginLeft,
			}
		};

		return dom.renderTemplate(template, data)
	}

	, render(type, series, title) {

		const now = new Date;
		const day = now.getDay();
		const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
			.rotate(day);

		const e  = this.create(labels, series, 'weekly-chart');
		return e.innerHTML;
	}
}

window.chart = chart;
