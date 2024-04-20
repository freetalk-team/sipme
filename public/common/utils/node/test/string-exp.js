
require('../../string');
require('../../object');

const exp = [
		'val(a)==5',
		'val(i)==5', 
		"val(c)=='OK'", 
		"val(s)=='test'", 
		'val(b)',
		'len(a)==0',
		'len(a)==3',
		'sum(a)',
		"sum(a) < 10 ? 'foo' : 'bar'",
		'avg(a)',
		'avgi(a)',
		'max(a)',
		'max(a) > 100',
		"arr(a).sum()", 
		"arr(b).sum()", 
		"arr(a).map(i => i + 100).sum()", 
		"var t = arr(a);t.sum() - t.max()",
		"var t=arr(a),f=val(i);(t.sum()-t.max())*f",
		"var t = arr(a);t.sum() + t.max() + t.avgi()",
		"arr(q).map(i => i.name)",
		"arr(q).map(i => i.value).sum()",
];

const align = exp.map(i => i.length).max() + 5;
const data = { a: [4,2,1,3], i: 5, b: true, s: 'test', q: [{ name: 'A', value: 1}, { name: 'B', value: 2}] };

console.log(data);

exp.map(i => console.log(i.align(align), '=>', i.evalCtx(data)));

