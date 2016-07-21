'use strict';
const aws = require('aws-sdk');
const logger = require('./logger')();
const urns = require('./urns');
const fs = require('fs');
const mkdirp = require('mkdirp');
const getDirName = require('path').dirname;

class DynamoHelper {

  constructor(config) {
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
    this.dynamoDb = new aws.DynamoDB.DocumentClient(credentials);
  }

  put(statement, messageError) {
    let id = statement.id;
    statement.stored = new Date().toJSON();
    statement.error = messageError;
    let enrollmentId;
    let directory;
    try {
      enrollmentId = statement.context.extensions[urns.enrollmentid];
      directory = statement.context.extensions[urns.directory];
    } catch (error) {
      enrollmentId = 'undefined';
      directory = 'undefined';
    }
    let params = {
      TableName: 'StatementDlq',
      Item: {
        Id: id,
        EnrollmentId: enrollmentId,
        Directory: directory,
        Stored: statement.stored,
        Statement: statement
      },
      'ConditionExpression': 'attribute_not_exists(Id)'
    };

    return new Promise((resolve, reject) => {
      this.dynamoDb.put(params, function writeMessage(err, data) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve({
            id: id,
            data: data
          });
        }
      });
    });
  }

  getItemFromDynamoDB(id, index, connection) {

    let params = {
      TableName: 'Statement_STG',
      KeyConditions: {
        Id: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [
            id
          ]
        }
      },
    };
    return new Promise((resolve, reject) => {
      this.dynamoDb.query(params, function(err, data) {
        if (err) {
          reject(err);
        } else {
          try {
            resolve(data);
            console.log('Request index: ' + index);
            let urn = `urn:atom:xapi:extension:loadtestid`;
            // console.log(data.Items[0].Statement.context.extensions[urn]);
            let uuid = data.Items[0].Id;
            let timestampOne = new Date(data.Items[0].Statement.timestamp);
            let storedTimeOne = new Date(data.Items[0].Stored);
            let processTime = Math.ceil(storedTimeOne.getTime() / 1000 - timestampOne.getTime() / 1000);
            let startTime = data.Items[0].Statement.timestamp;
            let storedTime = data.Items[0].Stored;
            let loadTestId = data.Items[0].Statement.context.extensions[urn];

            let query = `INSERT INTO Report VALUES ('${uuid}', '${loadTestId}', '${startTime}', '${storedTime}', '${processTime}')`;
            // console.log(query);
            connection.query(query, function(err, result) {
              if (err) {
                console.log(err);
              } else {
                logger.info('Report send to MySql Id ' + uuid);
              }
            });

            logger.info('Message Received from Dynamo Id ' + uuid);
          } catch (error) {
            logger.debug('Message not found in Dynamo Id ' + id);
            console.log(error);
          }
        }
      });
    });
  }

  getItemFromDlqDynamoDB(id) {
    let params = {
      TableName: 'StatementDlq',
      KeyConditions: {
        Id: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [
            id
          ]
        }
      }
    };
    return new Promise((resolve, reject) => {
      this.dynamoDb.query(params, function(err, data) {
        if (err) {
          reject(err);
        } else {
          try {
            logger.info('Message Received from DLQ Dynamo Id ' + data.Items[0].Id);
          } catch (error) {
            logger.info('Message not found in DLQ Dynamo Id ' + id);
          }
          resolve(data);
        }
      });
    });
  }
}

module.exports = DynamoHelper;
