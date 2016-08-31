'use strict';
// const frisby = require('frisby');
const utils = require('./utils');
const handlebars = require('handlebars');
const zpad = require('zpad');
// const Tester = require('./tester');
const _ = require('lodash');

handlebars.registerHelper('json', (object) => {
  return JSON.stringify(object);
});

module.exports = class Toss {
  constructor(req, responses, config, plugins, fileName) {
    // this.jwt = '';
    this.req = req;
    this.responses = responses;
    this.config = config;
    // this.plugins = plugins;
    // this.afterPlugin = this.req.afterPlugin;
    // this.beforePlugin = this.req.beforePlugin;

    // this.fileName = fileName;
    // output folder
    // this.outputFolder = `${config.basePath}/output`;
    // this.toss = frisby.create(`${fileName} ${req.id} ${req.description}`);
    // arrange request
    this.bindUrl(config.url, req.path, req.query);
    // this.bindHeaders(config.basePath, req.headers);
    this.addJwtHeader(config.basePath, req.profile, config.tokenSecret);
    // this.bindMethodAndBody(req.method, config.basePath, req.body);
    // this.addValidations();
  }

  writeTestCases() {
    utils.writeOnExistingFile(this.config, this.req);
  }

  afterRequests(responses) {
    this.toss.after((err, res, body) => {
      if (err) {
        utils.writeFile(`${this.outputFolder}/errors/${zpad(this.req.id)}.json`, err);
      }
      if (res) {
        utils.writeFile(`${this.outputFolder}/responses/${zpad(this.req.id)}.json`, res);
      }
      if (body) {
        utils.writeFile(`${this.outputFolder}/responses/${zpad(this.req.id)}.body.json`, body);
      }
      let json = utils.parseJsonSafe(body);
      if (this.afterPlugin) {
        let func = this.afterPlugin.split(',');
        let functionName = func[0];
        let args = func;
        if (functionName === 'printJwt') {
          args[0] = `${this.req.id}: ${this.jwt}`;
        } else {
          args[0] = `${this.req.id}: ${json}`;
        }
        let out = this.plugins[functionName].apply(null, args);
        if (out) {
          json[functionName] = out;
        }
      }
      if (this.req.childRequests) {
        responses[this.req.id] = json;
        this.req.childRequests.forEach((child) => {
          let toss = new Toss(child, responses, this.config, this.plugins, this.fileName);
          toss.afterRequests(responses);
          toss.run();
        });
      }
    });
  }

  addValidations() {
    // let testerInstance = new Tester();
    let val = this.req.validate;
    if (val.statusCode) {
      this.toss.expectStatus(parseInt(val.statusCode, 10));
    }
    if (val.headers) {
      let headers = this.bindResponses(val.headers);
      Object.keys(headers).forEach((key) => {
        this.toss.expectHeaderContains(key, headers[key]);
      });
    }
    if (val.jsonContains) {
      let json = utils.loadFile(this.config.basePath, val.jsonContains);
      let values = this.bindResponses(json);
      this.toss.expectJSON(values);
    }

    if (val.jsonNotContains) {
      let json = utils.loadFile(this.config.basePath, val.jsonNotContains);
      let values = this.bindResponses(json);
      this.toss.afterJSON(function(body) {
        // testerInstance.jsonNotContains(body, values);
      });
    }
    if (val.jsonSchema) {
      let json = utils.loadFile(this.config.basePath, val.jsonSchema);
      json = this.replaceValues(json);
      this.toss.expectJSONTypes(json);
    }
    if (val.jsonSchemaFile) {
      require(`${process.cwd()}/${this.config.basePath}/${val.jsonSchemaFile}`)(this.toss);
    }
  }

  replaceValues(json) {
    if (!json) {
      return json;
    }
    for (let key of Object.keys(json)) {
      let value = json[key];
      if (typeof(value) === 'object') {
        json[key] = this.replaceValues(json[key]);
      }
      if (value === 'undefined') {
        json[key] = undefined;
      }
      if (value === 'number') {
        json[key] = Number;
      }
      if (value === 'boolean') {
        json[key] = Boolean;
      }
      if (value === 'array') {
        json[key] = Array;
      }
      if (value === 'object') {
        json[key] = Object;
      }
      if (value === 'NaN') {
        json[key] = NaN;
      }
    }
    return json;
  }

  bindMethodAndBody(method, basePath, body) {
    let met = method.toLowerCase();
    if (met === 'put' || met === 'post' || met === 'delete') {
      let parsedBody = utils.loadJsonOrParse(basePath, body) || {};
      parsedBody = this.bindResponses(parsedBody);
      if (parsedBody) {
        utils.writeFile(`${this.outputFolder}/requestbody/${zpad(this.req.id)}.body.json`, parsedBody);
      }
      this.toss[met](this.fullUrl, parsedBody, {json: typeof parsedBody === 'object'});
    } else {
      this.toss[met](this.fullUrl);
    }
  }

  bindUrl(url, path, queryParams) {
    let defaultPath = this.config.defaultPath || '';
    let query = queryParams ? '?' + queryParams : '';
    this.req.url = `${url}/${defaultPath}${path}${query}`;
    this.fullUrl = this.bindResponses(this.fullUrl);
  }

  bindHeaders(basePath, headersOrJson) {
    if (headersOrJson) {
      let headers = utils.loadJsonOrParse(basePath, headersOrJson);
      headers = this.bindResponses(headers);
      this.toss.addHeaders(headers);
    }
  }

  bindResponses(input) {
    let template = input;
    let response = template;
    let isObj = typeof template === 'object';
    if (isObj) {
      template = JSON.stringify(template);
    }
    if (this.req.dependsOn) {
      let compiled = handlebars.compile(template);
      response = compiled(this.responses);
    }
    return utils.parseJsonSafe(response);
  }

  addJwtHeader(basePath, profileOrJson, secret) {
    if (profileOrJson) {
      let profile = utils.loadJsonOrParse(basePath, 'profiles/' + profileOrJson);
      profile = this.bindResponses(profile);
      let jwt = utils.createJwt(profile, secret);
      if (jwt) {
        // console.log(this.req.headers);
        if (this.req.headers === null || this.req.headers === undefined) {
          this.req.headers = {};
        }
        this.req.headers['authorization'] = `Bearer ${jwt}`;
        // this.toss.addHeader('authorization', `Bearer ${jwt}`);
        // this.jwt = `Bearer ${jwt}`;
      }
    }
  }

  run() {
    // this.toss.toss();
  }
};
