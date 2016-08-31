'use strict';

const co = require('co');
const LoadTestHandler = require('./loadTestHelper');

let loadTestHandlerInstance = new LoadTestHandler();

exports.load = co.wrap(function* load(reqCount) {
  try {
    let startTime = new Date().toJSON();
    let method = 'GET';
    let body = '';
    let basePath = 'http://localhost:4000/';
    let endpoint = 'api/v1/activity/1c29b194-661a-451e-a0ad-d3e37c0c71c9'
    let data = yield loadTestHandlerInstance.loadGenerator(reqCount, method, basePath, endpoint, body);
    // startTime = new Date().toJSON();
    // method = 'GET';
    // body = '';
    // basePath = 'http://localhost:4000/';
    // endpoint = 'api/v1/activity/1c29b194-661a-451e-a0ad-d3e37c0c71c90'
    // data = yield loadTestHandlerInstance.loadGenerator(reqCount, method, basePath, endpoint, body);
    let endTime = new Date().toJSON();
    console.log(JSON.stringify({
      message: 'Completed API Load Testing',
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
