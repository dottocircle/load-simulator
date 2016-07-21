#!/usr/bin/env node

'use strict';

const activityHandler = require('./src/lib/activityHandler');
const reportHandler = require('./src/lib/reportHandler');
const utils = require('./src/lib/utils');

let command = process.argv[2];
let count = process.argv[3] || 1;
let batch = process.argv[3] || '%';

let statement = null;
let currentDate = new Date().toJSON();

try {
  statement = utils.loadJsonOrParse(__dirname + '/statements', 'valid-statement.json');
  statement.context.extensions
  ['urn:atom:xapi:extension:loadtestid'] = `stg date: ${currentDate}, message: ${count}`;
} catch (error) {
  console.log('Some error happen in ' + error.stack);
}

// console.log(__dirname, statement);

if (command === 'post') {
  activityHandler.publishInBatch(count, statement);

} else if (command === 'get') {
  activityHandler.pullInBatch();
} else if (command === 'report') {
  activityHandler.displayReport(batch);
} else if (command === 'delete') {
  activityHandler.deleteIdentity();
} else if (command === 'count') {
  activityHandler.identityCount();
} else {
  console.log('Ops! invalid command');
}
