'use strict';

const co = require('co');
const LoadTestHandler = require('./loadTestHelper');

let loadTestHandlerInstance = new LoadTestHandler();

exports.load = co.wrap(function* load(reqCount) {
  try {
    let startTime = new Date().toJSON();
    let method = 'GET';
    let body = '';
    let path = 'https://qa-channel.atom.ktp.io/api/v1/ktp/grad/lsat/lsata/instructors';
    let data = yield loadTestHandlerInstance.loadGenerator(reqCount, method, path, body);
    let endTime = new Date().toJSON();
    console.log(JSON.stringify({
      message: 'Received batch activity from DynamoDB',
      res: {
        totalRequests: reqCount,
        startTime: startTime, endTime: endTime
      },
      summary: {data}
    }, null, 2));

  } catch (error) {
    console.log('Some error happen in', error.stack);
  }
});
