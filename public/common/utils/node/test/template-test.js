
require('../../string');

const { renderText } = require('../template');


// const ifexp = /@if\{\{(.*?)\}\}(.*?)@endif/s;
// const ifexp = /@if\{\{(.*?)\}\}((?:(@if\{\{[^}]+\}\}(?:.)*?@endif)|(?:.))*?)@endif/s;
// const ifexp = /@if\{\{(.*?)\}\}((?:(@if\{\{(.*?)\}\}(.*?)(@else(.*?))?@endif))|(?:.)*?)(@else(.*?))?@endif/s;
// const ifexp = /@if\{\{(.*?)\}\}((?:(@if(.*?)(@else(.*?))?@endif))|(?:.)*?)(@else(.*?))?@endif/s;
const ifexp = /@if\{\{(.*?)\}\}((?:(?:((@if\{\{[^}]+\}\}(?:(?:((@if\{\{[^}]+\}\}(?:.)*?@endif)|(@foreach\{\{[^}]+\}\}(?:.)*?@endforeach)))*?|(?:.))*?@endif)|(@foreach\{\{[^}]+\}\}(?:(?:((@if\{\{[^}]+\}\}(?:.)*?@endif)|(@foreach\{\{[^}]+\}\}(?:.)*?@endforeach)))*?|(?:.))*?@endforeach)))*?|(?:.))*?)@endif/s;

const section = `
<template id="editor-kwoter-request-subsection" class="container-col w3-border-bottom w3-padding-bottom">

			<div class="row">
				<b class="watermark-6 index fit">{{this.name.splitByCapital()}}</b>
				<button name="remove" class="icon fa" title="Remove" cmd="remove"></button>
			</div>

			@foreach{{this.items}}[_0]
				<tag index={{_0}}>
			@endforeach
		</template>`;

const nestedif = `
@if{{this}}
	@if{{this.own}}
		<a cmd="task-ticket-unassign" title="Unassign">unassign</a>
		<a cmd="task-ticket-close" title="Close">close</a>
	@else
		<a>{{this.name}}</a>
	@endif
@else
	<a cmd="task-ticket-assign" title="Assign">assign to me</a>
@endif
`;

const nestedif2 = `
@if{{this}}
	@if{{this.own}}
		kyp
	@else
		fooo
	@endif
@else
	<a cmd="task-ticket-assign" title="Assign">assign to me</a>
	
@endif
`;


//console.log(renderText(section, { name: 'foo', items: [1,2] } ));

console.log('##', renderText(nestedif2, null));
// console.log(renderText(nestedif, { own: true }));
// console.log(renderText(nestedif, { name: 'Ivan' }));

console.log(nestedif2.match(ifexp));

function parseCustomScript(customScript) {
    const tokenRegex = /\b(if|else|for|in|do|then|end)\b|("[^"]*"|'[^']*')|\b\d*\.?\d+\b|\b\w+\b|[^\s\w]/gm;

    const tokens = [];
    let match;

    while ((match = tokenRegex.exec(customScript)) !== null) {
        const [_, keyword, stringLiteral, number, identifier, other] = match;
        tokens.push(keyword || stringLiteral || number || identifier || other);
    }

    return tokens;
}

// Example usage:
const customScript = `
if (x > 0) {
    for (let i = 0; i < 10; i++) {
        console.log(i);
    }
} else {
    console.log("x is not greater than 0");
}
`;

const tokens = parseCustomScript(customScript);
//console.log(tokens);