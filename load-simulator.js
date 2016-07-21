#!/usr/bin/env node

'use strict';

const loadHandler = require('./src/lib/loadHandler');

let reqCount = process.argv[2] || 1;

if (reqCount) {
  loadHandler.load(reqCount);
} else {
  console.log('Ops! invalid command');
}
