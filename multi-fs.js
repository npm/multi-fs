var assert = require('assert'),
    stream = require('stream'),
    url = require('url'),
    util = require('util')

var MultiFSClient = require('./lib/client-base.js')
var MultiFSClientFS = require('./lib/client-fs.js')
var MultiFSClientSSH = require('./lib/client-ssh.js')
var MultiFSClientSCP = require('./lib/client-scp.js')

module.exports = MultiFS

util.inherits(MultiFS, MultiFSClient)

function MultiFS (clients, debug) {
  this.clients = clients.map(setupClient)
  this.name = this.clients.map(function(c) {
    return c.name
  }).join(',')
  this._debug = debug
  this._clients = clients

  this._tasks = []
  this._inFlight = {}
  this._processing = 0
  this._concurrency = 1

  MultiFSClient.call(this)
}

function setupClient(client) {
  if (client instanceof MultiFSClient || client instanceof MultiFS)
    return client

  if (typeof client === 'string') {
    if (client.match(/^ssh:/))
      return new MultiFSClientSSH(client)
    else if (client.match(/^scp:/))
      return new MultiFSClientSCP(client)
    else
      return new MultiFSClientFS(client)
  }

  switch (client.type) {
    case 'ssh':
      return new MultiFSClientSSH(client)
    case 'fs':
      return new MultiFSClientFS(client.path)
    case 'scp':
      return new MultiFSClientSCP(client)
    default:
      throw new Error('Undefined client type: ' + JSON.stringify(client))
  }
}

MultiFS.prototype.destroy = MultiFS.prototype.close = function() {
  this.clients.forEach(function (client) {
    client.destroy()
  })
}

MultiFS.prototype.readFile = function(target, enc, cb) {
  if (typeof enc === 'function') {
    cb = enc
    enc = null
  }

  this.exec({ cmd: "md5", args: [ target ] }, function(er, md5, results) {
    if (er)
      return cb(er, null, results)

    var client = results.clients[0]
    this.exec({
      cmd: "readFile",
      args: [ target, enc ],
      set: [ client ],
      serialize: function (n) { return md5 }
    }, cb)
  }.bind(this))
}

MultiFS.prototype.writeFile = function writeFile(target, data, enc, cb) {
  if (typeof enc === 'function') {
    cb = enc
    enc = null
  }

  if (typeof data === 'object' && data instanceof stream.Readable) {
    data.setMaxListeners(this.clients.length * 2)
  }

  this.exec({
    cmd: 'writeFile',
    args: [ target, data, enc ]
  }, cb)
}

MultiFS.prototype.writeFilep = function writeFilep(target, data, enc, cb) {
  if (typeof enc === 'function') {
    cb = enc
    enc = null
  }

  this.exec({
    cmd: 'writeFilep',
    args: [ target, data, enc ]
  }, cb)
}

MultiFS.prototype.rename = function rename(src, dest, cb) {
  this.exec({
    cmd: 'rename',
    args: [ src, dest ]
  }, cb)
}

MultiFS.prototype.justOne = function(command,args,cb){
  var clients = this.clients.slice()
  var last = 0

  args = args||[]
  if(!Array.isArray(args)){
    return setImmediate(function(){
      cb(new Error('args must be an array of arugments'))
    })
  }

  var errors = []
  execOne()

  function execOne(){
    if(!clients.length) {
      var e = new Error("no clients remaining. see `.errors` property for each client error.")
      e.errors = errors
      return cb(e)
    }

    var i = rnd(clients.length)
    var c = clients.splice(i,1)[0]

    args.push(function(err){
      if(err) {
        err.client = c
        errors.push(err)
        return execOne()
      }

      // calling callback in the context of the client so you can find out where the action was performed
      cb.apply(c,arguments)
    })

    c[command].apply(c,args)
  }

}

var simpleMethods =
  [
    ['md5'],
    ['rmr'],
    ['unlink'],
    ['rmdir'],
    ['mkdir'],
    ['mkdirp'],
    ['readdir', serializeReaddir],
    ['stat', serializeStat]
  ]

simpleMethods.forEach(function(ms) {
  var m = ms[0]
  var s = ms[1]
  MultiFS.prototype[m] = function(target, cb) {
    this.exec({
      cmd: m,
      args: [ target ],
      serialize: s
    }, cb)
  }
})

function serializeStat(st) {
  return (st.isFile ? 'f' : '-' ) + (st.isDirectory ? 'd' : '-')
}

function serializeReaddir(dir) {
  return dir.sort().join(',')
}

MultiFS.prototype.executeTask = function executeTask(task) {

  var self = this
  var opt = task.opts
  var cb = task.cb

  var set = opt.set || this.clients
  var cmd = opt.cmd
  var args = opt.args
  var serialize = opt.serialize || JSON.stringify

  var seen = 0
  var need = set.length
  var results = []
  var errors = []
  var extra = []
  var clients = []
  var matches = {}
  var conflict = null
  var firstError = null
  var ended = false

  set.forEach(function (client, i) {
    client[cmd].apply(client, args.concat(then.call(this, i)))
  }, this)

  function then(i) { return function(er, res, raw) {
    if (ended)
      return

    seen++
    firstError = firstError || er
    errors[i] = er
    results[i] = res
    extra[i] = raw
    clients.push(set[i])

    if (!er && !conflict) {
      this.debug('RESULT %d %s', i, cmd)
      var k = serialize(res)
      matches[k] = (matches[k] || 0) + 1

      if (Object.keys(matches).length > 1) {
        conflict = new Error('Inconsistent Results')
      }
    }
    if (seen === need)
      return done()
  }.bind(this) }

  function done() {
    if (ended)
      return

    ended = true

    var data = {
      errors: errors,
      results: results,
      extra: extra,
      clients: clients
    }

    var er = firstError || conflict
    if (er)
      cb(er, null, data)
    else
      cb(null, results[0], data) // all in agreement, no errors

    // clean up after this task & kick off the next
    self._processing--
    clearTimeout(task.timer)
    delete self._inFlight[task.id]
    self._process()
  }
}

// Task queue

var taskId = 0

MultiFS.prototype._process = function process() {
  this.debug('process %d(%d) of %d',
          this._processing,
          this._concurrency,
          this._tasks.length)

  if (this._processing < this._concurrency) {
    var task = this._tasks.shift()
    if (task) {
      this._processing++
      this.emit('task', task)
      this.executeTask(task)
    }
  }
}

MultiFS.prototype.exec = function exec(opts, callback) {
  assert(opts);
  assert(callback && typeof callback === 'function');

  var task = {
    opts: opts,
    cb: callback,
    id: taskId++
  };
  this.debug('pushTask', task)

  this._inFlight[task.id] = task
  if (this._timeout > 0) {
    task.timer = setTimeout(taskTimeout.bind(this, task), this._timeout)
    task.timer.unref()
  }
  this._tasks.push(task)
  this._process()
}

function taskTimeout(task) {
  if (this._inFlight[task.id]) {
    var er = new Error('timeout')
    er.task = task
    this.emit('error', er)
  }
}

function rnd(max){
  return Math.floor(Math.random()*1000%max)
}
