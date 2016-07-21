'use strict';

const csv = require('csv-parse');
const fs = require('fs');
const yaml = require('js-yaml');
const jwt = require('jsonwebtoken');
const mkdirp = require('mkdirp');
const getDirName = require('path').dirname;

let exists = (file) => {
  try {
    let stat = fs.statSync(file);
    return stat.isFile();
  } catch (err) {
    return false;
  }
};

let parseJsonSafe = exports.parseJsonSafe = (body) => {
  try {
    if (typeof body === 'object') return body;
    return JSON.parse(body);
  } catch (err) {
    return body;
  }
};

exports.loadJsonOrParse = (basePath, jsonOrFile) => {
  let filePath = `${basePath}/${jsonOrFile}`;
  if (!exists(filePath)) {
    return parseJsonSafe(jsonOrFile);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(err);
    return null;
  }
};

exports.loadFile = (basePath, jsonOrFile) => {
  let filePath = `${basePath}/${jsonOrFile}`;
  if (!exists(filePath)) {
    return jsonOrFile;
  }
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(err);
    return null;
  }
};

exports.loadYAMLOrParse = (basePath, yamlOrFile) => {
  let filePath = `${basePath}/${yamlOrFile}`;
  if (!exists(filePath)) {
    return parseJsonSafe(yamlOrFile);
  }
  try {
    return yaml.safeLoad(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(err);
    return null;
  }
};

exports.parseCSV = (file) => {
  if (!exists(file)) { return null };
  return new Promise((resolve, reject) => {
    var parser = csv(
      // { delimiter: ',', columns: true },
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
};
