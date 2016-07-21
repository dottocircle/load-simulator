'use strict';

const co = require('co');
const reportHandler = require('./reportHandler');
const logger = require('./logger')();
const SnsHelper = require('./snsHelper');
const DynamoHelper = require('./dynamoHelper');
const config = require('../config');
const MySqlHelper = require('./mySqlHelper');

let mySqlHelperInstance = new MySqlHelper(config.mySql);
let snsHelperInstance = new SnsHelper(config.snsStg);
let dynamoHelperInstance = new DynamoHelper(config.dynamoStg);

exports.publishInBatch = co.wrap(function* publishInBatch(count, statement) {
  let connection = yield mySqlHelperInstance.connect();
  try {
    for (let i = 1; i <= count; i++) {
      yield snsHelperInstance.publish(statement, i, connection);
    }
  } catch (error) {
    console.log('Some error happen in ' + error.stack);
  }
  yield mySqlHelperInstance.close();
});

exports.pullInBatch = co.wrap(function* pullInBatch() {
  let connection = yield mySqlHelperInstance.connect();
  try {
    let uuids = yield reportHandler.getIdentity(connection);
    let index = 0;

    for (let uuid of uuids) {
      yield dynamoHelperInstance.getItemFromDynamoDB(uuid.Id, index, connection);
      index++;
    }
  } catch (error) {
    console.log('Some error happen in ' + error.stack);
  }
  yield mySqlHelperInstance.close();
});

exports.deleteIdentity = co.wrap(function* deleteIdentity() {
  let query = `DELETE FROM Identity`;
  let connection = yield mySqlHelperInstance.connect();
  try {
    let data = yield mySqlHelperInstance.dataQuery(connection, query);
    logger.info('Delete identity from MySql, affectedRows ' + data.affectedRows);
  } catch (error) {
    console.log('Some error happen in ' + error.stack);
  }
  yield mySqlHelperInstance.close();
});

exports.identityCount = co.wrap(function* identityCount() {
  let query = `SELECT * FROM Identity`;
  let connection = yield mySqlHelperInstance.connect();
  try {
    let data = yield mySqlHelperInstance.dataQuery(connection, query);
    logger.info('Identity count in MySql ' + data.length);
  } catch (error) {
    console.log('Some error happen in ' + error.stack);
  }
  yield mySqlHelperInstance.close();
});

exports.displayReport = co.wrap(function* displayReport(batch) {
  let connection = yield mySqlHelperInstance.connect();
  try {
    let data = yield reportHandler.getReport(connection, batch);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Some error happen in ' + error.stack);
  }
  yield mySqlHelperInstance.close();
});
