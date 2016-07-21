'use strict';

const logger = require('./logger')();
const loadtest = require('loadtest');
const csv = require('csv-parse');
const fs = require('fs');
const mkdirp = require('mkdirp');
const getDirName = require('path').dirname;
const csvWriter = require('csv-write-stream');

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

class LoadTestHandler {

  loadGenerator(reqCount, method, path, body) {
    let params = {
      url: path,
      method: method,
      contentType: 'application/json',
      secureProtocol: 'TLSv1_method',
      maxRequests: reqCount,
      concurrency: reqCount,
      statusCallback: this.statusCallbackGET
    };

    if (method === 'POST') {
      params.body = JSON.stringify(body);
    }

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

    try {
      // let uuid = JSON.parse(result.body).Items[0].Id;
      // let writeTime = new Date(JSON.parse(result.body).Items[0].Statement.timestamp);
      // let storeTime = new Date(JSON.parse(result.body).Items[0].Stored);
      // let path = './response.csv';
      // mkdirp(getDirName(path), () => {
      //   // fs.appendFile(path, uuid + ',' + writeTime.replace(/T/, ' ').replace(/Z/, '') + ',' + storeTime.replace(/T/, ' ').replace(/Z/, '') + '\n');
      //   fs.appendFile(path, uuid + ',' + writeTime.getTime() / 1000 + ',' + storeTime.getTime() / 1000 + '\n');
      // });

      // console.log('Latency: ',JSON.stringify(latency));
      log.error('Test Started');
      console.log('Request elapsed milliseconds: ', error ? error.requestElapsed : result.requestElapsed);
      let time = error ? error.statusCode : new Date(result.headers.date)/1000;
      let elapsed = error ? error.requestElapsed : result.requestElapsed;
      let label = 'label';
      let responseCode = error ? error.statusCode : result.statusCode;
      let threadName = error ? error.instanceIndex : result.instanceIndex;
      let headers = error ? error.statusCode : result.headers;
      let endPoint = 'endPoint';
      let Latency = latency.meanLatencyMs;
      let sampleCount = error ? error.requestIndex : result.requestIndex;
      let errorCount = error ? error.requestIndex : latency.totalErrors;
      let hostname = 'Hostname';
      let bytes;
      if (headers !== undefined) {
        bytes = Object.keys(headers).map(function(_) { return headers[_]; })[4];
      }
      // console.log(bytes);
      console.log('-------');

      // let writer = csvWriter();
      writer.write({
        time: time,
        elapsed: elapsed,
        label: label,
        responseCode: responseCode,
        threadName: threadName,
        bytes: bytes,
        endPoint: endPoint,
        latency: Latency,
        sampleCount: sampleCount,
        errorCount: errorCount,
        hostname: hostname
      });
      // writer.end();
      // console.log('Request elapsed milliseconds: ', error ? error.requestElapsed : result.requestElapsed);
      // console.log('Request elapsed milliseconds: ', error ? error.requestElapsed : result.requestElapsed);
      // console.log('Request index: ', error ? error.requestIndex : result.requestIndex);
      // console.log('Request loadtest() instance index: ', error ? error.instanceIndex : result.instanceIndex);
      // console.log('----');
      // console.log('Request uuid: ', JSON.stringify(result, null, 2));
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
