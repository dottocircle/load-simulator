'use strict';

const bunyan = require('bunyan');
const config = require('../config');
const Logger = require('le_node');

let streams = [];

if (config.logging.logEntries.enabled) {
  streams.push(Logger.bunyanStream({
    token: config.logging.logEntries.key,
    minLevel: config.logging.logEntries.level
  }));
}

if (config.logging.stdout.enabled) {
  streams.push({
    stream: process.stdout,
    level: config.logging.stdout.level
  });
}

function logger() {
  return bunyan.createLogger({
    name: 'load-simulator Service',
    serializers: bunyan.stdSerializers,
    streams: streams
  });
}

module.exports = logger;

