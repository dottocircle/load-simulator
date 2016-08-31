'use strict';
const _ = require('lodash');
const Toss = require('./toss');
const fs = require('fs');
const path = require('path');
const LoadTestHandler = require('./loadTestHelper');
const co = require('co');

let filterTests = process.env.filterTests;

module.exports = class Tosser
{
  constructor(config, requests, fileName) {
    this.url = config.url;
    // console.log(config)
    this.name = config.project;
    this.config = config;
    this.deferredRequests = {};
    this.savedResponses = {};
    this.tokenSecret = config.tokenSecret;
    this.wireUpDependents(requests);
    this.tosses = [];
    this.loadPlugins();
    this.requests = requests;
    if (filterTests) {
      let testsToRun = filterTests.split(',');
      this.requests = _.filter(requests, (req) => {
        return _.includes(testsToRun, req.id);
      });
    }
    for (let req of this.requests) {
      // console.log(req);
      // if (req.validate.statusCode === 200) {
        delete req['validate'];
        let toss = new Toss(req, this.savedResponses, config, this.plugins, fileName);
        // toss.writeTestCases();
        // toss.afterRequests(this.savedResponses);
        delete toss['config'];
        delete toss['responses'];
        delete toss['req.validate'];
        this.tosses.push(toss);
      // }
    }

    // console.log(JSON.stringify(this.tosses, null, 2));
  }

  loadPlugins() {
    try {
      let plugins = fs.statSync(`${this.config.basePath}/plugins/plugins.js`);
      if (plugins && plugins.isFile()) {
        if (path.isAbsolute(this.config.basePath)) {
          this.plugins = require(`${this.config.basePath}/plugins/plugins.js`);
        } else {
          this.plugins = require(`${process.cwd()}/${this.config.basePath}/plugins/plugins.js`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  tossAll() {
    let loadTestHandlerInstance = new LoadTestHandler();
    for (let toss of this.tosses) {
      // console.log(toss.req);
      (co.wrap(function* start() {
        try {
          loadTestHandlerInstance.loadGeneratorFinal(1, toss.req);
        } catch (error) {
          console.log(error);
          // process.exit(1);
        }
      }))();
    }
  }

  wireUpDependents(requests) {
    // nest dependent requests
    let dependentReqs = _.filter(requests, (req) => {
      return parseInt(req.dependsOn, 10) > 0;
    });
    _.each(dependentReqs.reverse(), (depReq) => {
      let dep = _.find(requests, (req) => {
        return req.id === depReq.dependsOn;
      });
      _.remove(requests, (req) => {
        return req.id === depReq.id;
      });
      if (dep) {
        if (!dep.childRequests) {
          dep.childRequests = [];
        }
        dep.childRequests.push(depReq);
      }
    });
  }
};
