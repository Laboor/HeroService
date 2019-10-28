let mongoose = require('mongoose');
let schema = require('../schema/schema');

let modelStrCache = [null, null];
let model = null;
let schemas = new Map();
let models = new Map();

// 数据库配置
let dbOptions = {
  poolSize: 5,
  keepAlive: 120,
  reconnectTries: 10,
  reconnectInterval: 30,
  connectTimeoutMS: 10000
}
let schemaOptions = {
  strict: true,
  versionKey: false
}

// 连接数据库函数
function connect(connectUrl, options = dbOptions) {
  mongoose.connect(connectUrl, options);
  mongoose.connection.on('error', (error) => {
    console.log('connect fail:', error);
  })
  mongoose.connection.on('connected', () => {
    console.log('connect seccess!');
  })
  mongoose.connection.on('disconnected', () => {
    console.log('connect disconnected');
  })
}

// 数据库初始化函数
function init(connectUrl, options = dbOptions) {
  connect(connectUrl, options)
  createSchemas();
  createModels();
}

// 关闭数据库连接函数
function close() {
  mongoose.connection.close();
  model = null;
  modelStrCache = [null, null];
  schemas.clear();
  models.clear();
}

// 中间件工厂函数
function useMiddleware(schema, options) {
  switch (options.hook) {
    case 'pre':
      schema.pre(options.method, options.callBack);
      break;
    case 'post':
      schema.post(options.method, options.callBack);
      break;
    default:
      schema.pre(options.method, options.callBack);
  }
}

// 创建Schema
function createSchema(typeObj, options = schemaOptions, ...args) {
  let newSchema = new mongoose.Schema(typeObj, options);
  if (args) {
    for (let opt of args) {
      useMiddleware(newSchema, opt);
    }
  }
  return newSchema;
}

// 创建Schemas
function createSchemas(...args) {
  if (JSON.stringify(schema) == '{}') return;
  for (let key in schema) {
    let newSchema = new mongoose.Schema(schema[key], schemaOptions);
    if (args) {
      for (let opt of args) {
        useMiddleware(newSchema, opt);
      }
    }
    schemas.set(key, newSchema);
  }
}

// 创建Model
function createModel(modelStr) {
  if (JSON.stringify(schema) == '{}') {
    console.error(schema, 'is empty, Can’t create model!');
    return;
  }
  if (!modelStr in schema || models.has(modelStr)) return;
  let typeObj = schema[modelStr];
  let newModel = mongoose.model(modelStr, createSchema(typeObj));
  models.set(modelStr, newModel);
  return newModel;
}

// 创建Models
function createModels() {
  if (!schemas.size) return;
  for (let entry of schemas) {
    let newModel = mongoose.model(entry[0], entry[1]);
    models.set(entry[0], newModel);
  }
}

// 通过URL query参数获取Model
function getModel(modelStr) {
  let str = modelStr;
  modelStrCache[0] = str;
  if (modelStrCache[0] != modelStrCache[1]) {
    model = models.get(str);
    modelStrCache[1] = str;
  }
}

// 数据库操作Express中间件
function dbOperate(req, res, next) {
  switch (req.method) {
    case 'GET':
      find(req, res, next);
      break;
    case 'POST':
      add(req, res, next);
      break;
    case 'DELETE':
      del(req, res, next);
      break;
    case 'UPDATE':
      update(req, res, next);
      break;
    case 'OPTIONS':
      next();
      break;
    default:
      console.log(`Received an unknown http method, method name: ${req.method}`);
      return next();
  }
}

// 数据库查询操作中间件
function find(req, res, next) {
  getModel(req.query.model);
  if (!model) return next();
  model.find(null, function (err, docs) {
    if (err) {
      console.log(err);
      res.info = { error: err };
      return next();
    }
    res.body = docs;
    res.info = { message: 'GET sccessfull' };
    next();
  })
}

// 数据库新增操作中间件
function add(req, res, next) {
  getModel(req.query.model);
  if (!model) return next();
  model.create(req.body, function (err, docs) {
    if (err) {
      console.log(err);
      res.info = { error: err };
      return next();
    }
    res.body = docs;
    res.info = { message: 'POST sccessfull' };
    next();
  })
}

// 数据库删除操作中间件
function del(req, res, next) {
  // getModel(req.query.model);
  // if (!model) next();
  // model.create(req.body, function (err, docs) {
  //   if (err) {
  //     console.log(err);
  //     next();
  //   }
  //   res.body = docs;
  //   res.info = { message: 'POST sccessfull' };
  //   next();
  // })
  next();
}

// 数据库更新操作中间件
function update(req, res, next) {
  // getModel(req.query.model);
  // if (!model) next();
  // model.create(req.body, function (err, docs) {
  //   if (err) {
  //     console.log(err);
  //     next();
  //   }
  //   res.body = docs;
  //   res.info = { message: 'POST sccessfull' };
  //   next();
  // })
  next();
}

module.exports = mongodb = {
  dbOptions: dbOptions,
  schemaOptions: schemaOptions,
  connect: connect,
  createSchema: createSchema,
  createSchemas: createSchemas,
  createModel: createModel,
  createModels: createModels,
  init: init,
  dbOperate: dbOperate,
  find: find,
  add: add,
  close: close,
  schemas: schemas,
  models: models
};