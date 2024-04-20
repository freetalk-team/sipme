#!/usr/bin/env node

const fs = require('fs');

const marked = require('../common/marked');
const md = fs.readFileSync(process.argv[2], 'utf8');
const html = marked.parse(md);

console.log(html);
