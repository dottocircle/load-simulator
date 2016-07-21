'use strict';
const utils = require('./utils');
const co = require('co');
const config = require('../config');
const MySqlHelper = require('./mySqlHelper');

let mySqlHelperInstance = new MySqlHelper(config.mySql);
const resultMap = {};
const finalResult = {};

exports.getReport = co.wrap(function* getReport(connection, batch) {

  return new Promise((resolve, reject) => {

    let query = `select * from Report WHERE LoadTestId LIKE 'stg %${batch}'`;
    connection.query(query, function(err, data) {
      if (err) {
        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
      } else {
        console.log("Performance Test Report");

        let grandTotalMessage = data.length;

        data
          // .filter(item => item.EnrollmentId.includes('message: 10000'))
          .forEach(function(RowDataPacket) {
          const currentDate = new Date(RowDataPacket.StoredTime);

          if (!resultMap.hasOwnProperty(RowDataPacket.LoadTestId)) {
            resultMap[RowDataPacket.LoadTestId] = {
              minStoredDate: currentDate,
              maxStoredDate: currentDate,
              messageCount: 1
            }
          } else {
            let testEntry = resultMap[RowDataPacket.LoadTestId];

            if (currentDate < testEntry.minStoredDate) {
              testEntry.minStoredDate = currentDate;
            }

            if (currentDate > testEntry.maxStoredDate) {
              testEntry.maxStoredDate = currentDate;
            }

            testEntry.messageCount++;
          }
        });

        let grandTotalProcessTime = 0;
        let grandAverageworkerCapacity = null;

        for (let key in resultMap) {
          let max = resultMap[key].maxStoredDate;
          let min = resultMap[key].minStoredDate;
          let count = resultMap[key].messageCount;

          resultMap[key].totalProcessTime = Math.ceil(max/1000 - min/1000);
          resultMap[key].workerCapacity = parseFloat(Math.round(count/resultMap[key].totalProcessTime * 100)/100);

          grandTotalProcessTime += resultMap[key].totalProcessTime;
        }

        finalResult.grandSummary = {
          totalRound: Object.keys(resultMap).length,
          grandTotalMessage: grandTotalMessage,
          grandTotalProcessTime: grandTotalProcessTime,
          grandAverageWorkerCapacity: parseFloat(Math.round(grandTotalMessage/grandTotalProcessTime * 100)/100)
        };

        finalResult.detail = resultMap;

        resolve(finalResult);
      }
    });
  });
});

exports.getIdentity = co.wrap(function* getIdentity(connection) {
  let query = `select * from Identity`;

  return new Promise((resolve, reject) => {
    connection.query(query, function(err, data) {
      if (err) {
        let wrappedError = new Error('Unable to query');
        wrappedError.innerError = err;
        reject(wrappedError);
      } else {
        resolve(data);
      }
    });
  });
});

