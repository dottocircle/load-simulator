'use strict';

const loadtest = require('loadtest');
const csv = require('csv-parse');
const fs = require('fs');
const mkdirp = require('mkdirp');
const getDirName = require('path').dirname;
const csvWriter = require('csv-write-stream');
const utils = require('./utils');

let writer = csvWriter({sendHeaders: false});
writer.pipe(fs.createWriteStream('out.csv'));

const Log = require('log');

// globals
let log = new Log('debug');

let exists = (file) => {
  try {
    let stat = fs.statSync(file);
    return stat.isFile();
  } catch (err) {
    return false;
  }
};

let requestIndex;
let currentEndpoint;

class LoadTestHandler {

  loadGenerator(reqCount, method, basePath, endpoint, body) {
    currentEndpoint = endpoint;
    let params = {
      url: basePath + endpoint,
      method: method,
      contentType: 'application/json',
      secureProtocol: 'TLSv1_method',
      // headers: {},
      requestsPerSecond: 20,
      maxRequests: reqCount
      // concurrency: reqCount,
      // statusCallback: this.statusCallbackGET
    };
    params.headers = {};
    params.headers['some'] = 'another';
    params.statusCallback = this.statusCallbackGET

    if (method === 'POST') {
      params.body = JSON.stringify(body);
    }

    return new Promise((resolve, reject) => {
      loadtest.loadTest(params, function writeMessage(err, data) {
        if (err) {
          reject(err);
        } else {
          // console.log(data)
          resolve(data);
        }
      });
    });
  }

  loadGeneratorFinal(reqCount, req) {

    return new Promise((resolve, reject) => {
      currentEndpoint = req.path;
      // console.log(currentEndpoint)
      req.statusCallback = this.statusCallbackGET
      req.maxRequests = reqCount;
      loadtest.loadTest(req, function writeMessage(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  loadGeneratorPOST(body, count) {
    let params = {
      url: 'http://localhost:4000/api/v1/activity',
      method: 'POST',
      contentType: 'application/json',
      maxRequests: count,
      body: JSON.stringify(body),
      statusCallback: this.statusCallbackPOST
    };

    return new Promise((resolve, reject) => {
      loadtest.loadTest(params, function writeMessage(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  loadGeneratorGET(uuid, index) {
    requestIndex = index;
    let params = {
      url: 'http://localhost:4000/api/v1/activity/' + uuid,
      maxRequests: 1,
      statusCallback: this.statusCallbackGET
    };

    return new Promise((resolve, reject) => {
      loadtest.loadTest(params, function writeMessage(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  statusCallbackGET(latency, result, error) {

    // console.log(result)

    try {
      let time = error ? (new Date())/1000 : new Date(result.headers.date)/1000;
      let elapsed = error ? error.requestElapsed : result.requestElapsed;
      let label = 'label';
      let responseCode = error ? error.statusCode : result.statusCode;
      let threadName = error ? error.instanceIndex : result.instanceIndex;
      let headers = error ? error.headers : result.headers;
      let endPoint = error ? error.path : result.path;;
      let Latency = latency.meanLatencyMs;
      let sampleCount = error ? error.requestIndex : result.requestIndex;
      let errorCount = latency.totalErrors;
      let hostname = error ? error.host : result.host;
      let bytes = error ? error.headers['content-length'] : result.headers['content-length'];
      // if (headers !== undefined) {
      //   bytes = Object.keys(headers).map(function(_) { return headers[_]; })[4];
      // }

      if (responseCode !== 200) {
        console.log(`latency: ${JSON.stringify(latency, null, 2)}\n result: ${JSON.stringify(result, null, 2)}\n error: ${JSON.stringify(error, null, 2)}`);
        console.log('-------');
      }

      let data = `${time},${elapsed},${label},${responseCode},${threadName},${bytes},${endPoint},${Latency},${sampleCount},${errorCount},${hostname}\n`;
      utils.writeOnExistingFile('./out.csv', data);
    } catch (err) {
      console.error(err);
    }
  }

  statusCallbackPOST(latency, result, error) {

    try {
      let uuid = JSON.parse(result.body).uuid;
      let path = './request.csv';
      mkdirp(getDirName(path), () => {
        fs.appendFile(path, uuid + ',\n');
      });
      console.log('Request index: ' + result.requestIndex);
    } catch (err) {
      console.error(err);
    }
  }

  parseCSV(file) {
    if (!exists(file)) return null;
    return new Promise((resolve, reject) => {
      var parser = csv(
        // { delimiter: ',', columns: false },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
          parser.end();
        });
      fs.createReadStream(file).pipe(parser);
    });
  }
}

module.exports = LoadTestHandler;
