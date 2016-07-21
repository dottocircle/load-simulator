'use strict';

const aws = require('aws-sdk');
const logger = require('./logger')();
const fs = require('fs');
const mkdirp = require('mkdirp');
const getDirName = require('path').dirname;

let uuid = '';
let timestamp = '';

class SnsHelper {

  constructor(config) {
    this.config = config;
    if (!config) {
      throw Error('config cannot be undefined');
    }

    // Check config properties
    if (!config.accessKeyId || typeof config.accessKeyId !== 'string') {
      throw new Error('accessKeyId property missing or invalid');
    }

    if (!config.secretAccessKey || typeof config.secretAccessKey !== 'string') {
      throw Error('secretAccessKey property missing or invalid');
    }

    if (!config.region || typeof config.region !== 'string') {
      throw Error('region property missing or invalid');
    }

    let credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    };
    this.sns = new aws.SNS(credentials);
  }

  publish(activity, index, connection) {
    uuid = this.generateUUID();
    timestamp = new Date().toJSON();
    activity.id = uuid;
    activity.timestamp = timestamp;
    let params = {
      Message: JSON.stringify(activity),
      TopicArn: this.config.arn
    };

    return new Promise((resolve, reject) => {
      this.sns.publish(params, function publish(err, data) {
        if (err) {
          let wrappedError = new Error('Activity publish failed');
          wrappedError.innerError = err;
          reject(wrappedError);
        } else {
          resolve(data);
          try {
            let uuid = JSON.parse(params.Message).id;
            let query = `INSERT INTO Identity VALUES ('${uuid}')`;

            connection.query(query, function(err, result) {
              if (err) {
                console.log(err);
              } else {
                logger.info('Identity send to MySql Id ' + uuid);
              }
            });

            console.log('Request index: ' + index);
          } catch (err) {
            console.error(err);
          }
          // console.log(JSON.parse(params.Message).id);
          logger.info('Activity send to SNS UUID ' + JSON.parse(params.Message).id);
        }
      });
    });
  }

  generateUUID() {
    let d = new Date().getTime();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      let r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c == 'x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
  }

  getCurrentUuid() {
    return uuid;
  }

  getCurrentTimestamp() {
    return timestamp;
  }
}

module.exports = SnsHelper;
