const Router = require('express').Router
const _ = require('lodash')
const predefinedFuncs = require('./pre-defined.json')

const logger = (path, logMessage) => {
  console.log(`${new Date().toISOString()} - ${path}: ${logMessage}`)
}

// =============================================================================
// in mem functions

const inMemFunc = {}

const updateFunction = (funcName, funcBody, updateOrAdd) => {
  try {
    inMemFunc[funcName] = {
      'execute': new Function('req', 'res', funcBody),
      'function': funcBody,
      'createdAt': new Date()
    }
    return {
      'message': `Function ${funcName} has been ${updateOrAdd}.`
    }
  } catch (e) {
    return {
      'message': e.stack.split('\n'),
      'function': funcBody
    }
  }
}

// =============================================================================
// initialise

// load predefined functions
for (let k in predefinedFuncs) {
  const result = updateFunction(k, predefinedFuncs[k], 'added')
  logger('initial', JSON.stringify(result, null, 2))
}


// =============================================================================
// middlewares

const funcParamsMiddleware = (req, res, next) => {
  const body = req.body
  const reply = replyHandler('funcParamsMiddleware', res)
  if (!_.has(body, 'name'))
    reply(400, {
      'message': 'Field (name) is missing in json body.'
    })
  req.funcName = body.name
  if (!_.has(body, 'function'))
    reply(400, {
      'message': 'Field (function) is missing in json body.'
    })
  req.funcBody = body.function
  next()
}

const funcNameMiddleware = (req, res, next) => {
  const funcName = req.params.funcName + req.params[0]
  if (funcName in inMemFunc) {
    req.funcName = funcName
    next()
  } else {
    const reply = replyHandler(req.path, res)
    reply(404, {
      'message': `Function ${funcName} is not found.`
    })
  }
}

// ===========================================================================
// execution and replies

const executeFunction = (method) => {
  return (req, res) => {
    const funcName = req.funcName
    const reply = replyHandler(`${method} /execute/${funcName}`, res)
    try {
      setTimeout(() => {inMemFunc[funcName].execute(req, res)
      logger(`${method} /execute/${funcName}`, JSON.stringify({
        'headers': req.headers,
        'query': req.query,
        'body': req.body
      }, null, 2))}, 1000)
    } catch (e) {
      reply(500, {
        'message': e.stack.split('\n')
      })
    }
  }
}

const replyHandler = (path, res) => {
  return (statusCode, jsonResponse, message) => {
    let logMessage = message
    if (!logMessage)
      logMessage = JSON.stringify(jsonResponse, null, 2)
      logger(path, logMessage)
    res.status(statusCode).json(jsonResponse)
  }
}

const createRouter = (rootPath) => {

  const router = Router()

  // ===========================================================================
  // root serving a list of functions with UI

  router.get('/', (req, res) => {
    const funcs = []
    for (k in inMemFunc) {
      funcs.push({
        'funcName': k,
        'createdAt': inMemFunc[k].createdAt
      })
    }
    const sortedFuncs = funcs.sort((a, b) => {
      return -(a.createdAt - b.createdAt)
    })
    res.render(`${rootPath}/funcs`, {
      funcs: sortedFuncs.map(v => {
        v['createdAt'] = v.createdAt.toISOString()
        return v
      }),
      rootPath
    })
  })

  // ===========================================================================
  // function APIs

  // get function list
  router.get('/funcs', (req, res) => {
    const reply = replyHandler('GET /funcs', res)
    reply(200, inMemFunc, 'return inMemFunc')
  })
  
  // create function  
  router.post('/funcs', funcParamsMiddleware, (req, res) => {
    const reply = replyHandler('POST /funcs', res)
    if (req.funcName in inMemFunc)
      reply(409, {
        'message': `Function ${req.funcName} has been defined already.`
      })
    else
      reply(200, updateFunction(req.funcName, req.funcBody, 'added'))
  })
  
  // update function
  router.put('/funcs', funcParamsMiddleware, (req, res) => {
    const reply = replyHandler('PUT /funcs', res)
    reply(200, updateFunction(req.funcName, req.funcBody, 'updated'))
  })
  
  // edit function
  router.get('/funcs/:funcName*', funcNameMiddleware, (req, res) => {
    const func = inMemFunc[req.funcName]
    res.render(`${rootPath}/editor`, {
      funcName: req.funcName,
      funcDisplayName: req.funcName.replace(new RegExp('/', 'g'), '_').replace(new RegExp('-', 'g'), '_'),
      funcBody: func.function,
      rootPath
    })
  })

  // edit delete
  router.delete('/funcs/:funcName*', funcNameMiddleware, (req, res) => {
    const funcName = req.funcName
    const reply = replyHandler(`DELETE /funcs/${funcName}`, res)
    delete inMemFunc[funcName]
    reply(200, {
      'message': `Function ${funcName} has been deleted`
    })
  
  })
  
  // ===========================================================================
  // execute function

  router.get('/execute/:funcName*', funcNameMiddleware, executeFunction("GET"))
  
  router.post('/execute/:funcName*', funcNameMiddleware, executeFunction("POST"))

  router.put('/execute/:funcName*', funcNameMiddleware, executeFunction("PUT"))

  router.delete('/execute/:funcName*', funcNameMiddleware, executeFunction("DELETE"))

  return router
}

module.exports = {
  createRouter
}