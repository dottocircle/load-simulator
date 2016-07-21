'use strict';

const mysql = require('mysql');
const logger = require('./logger')();

let connection = null;

class MySqlHelper {

  constructor(config) {
    this.dbConfig = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database
    };
  }

  connection() {
    return new Promise((resolve, reject) => {
      connection = mysql.createConnection(this.dbConfig);
      connection.connect(function connect(err) {
        if (err) {
          logger.info('connection error', err);
        } else {
          resolve(connection);
          logger.debug('db connection on');
        }
      });
    });
  }

  *dataQuery(connection, query) {
    return new Promise((resolve, reject) => {
      connection.query(query, function(err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  *connect() {
    connection = yield this.connection();
    return connection;
  }

  *close() {
    connection.end();
    logger.debug('db connection close');
  }
}

module.exports = MySqlHelper;

// connection.query("select * from user", function(err, rows) {
//   connection.end();
//   if (!err) {
//       console.log(JSON.stringify(rows));
//   } else {
//     console.log(err);
//   }
// });

