#!/usr/bin/env node

const { getSearchInfo } = require('../common/md');

const md = `
# Title

some stufff

## Topic 1

no dessc

### Sub topic

1. TExt
2. Fooo
`;

const r = getSearchInfo(md);

console.log(r);