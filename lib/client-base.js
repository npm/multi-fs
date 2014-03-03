module.exports = MultiFSClient
var path = require('path')
var util = require('util')
var EE = require('events').EventEmitter
util.inherits(MultiFSClient, EE)
function MultiFSClient() {
  EE.call(this)
  if (/\bmfs\b/.test(process.env.NODE_DEBUG || ''))
    this._debug = true
}

MultiFSClient._debug = false
MultiFSClient.name = ''

MultiFSClient.prototype.destroy = function() {}

MultiFSClient.prototype.debug = function() {
  if (this._debug) {
    // TODO dtrace probes or whatever
    var m = util.format.apply(util, arguments)
    console.error('%s<%s> %s', this.constructor.name, this.name, m)
  }
}

MultiFSClient.prototype.cleanPath = function(p) {
  return (this.path + path.join('/', p)).replace(/\/+$/, '')
}

MultiFSClient.prototype.rmr = function(p, cb) {
  this.stat(p, function(er, st) {
    if (er)
      return cb(er)
    if (st.isDirectory)
      rmKids.call(this, p, cb)
    else
      this.unlink(p, cb)
  }.bind(this))
}

function rmKids(p, cb) {
  var n, errState

  this.readdir(p, function(er, kids) {

    if (er)
      return cb(er)

    if (kids.length === 0) {
      this.debug('no kids, rmdir', p)
      return this.rmdir(p, cb)
    }

    n = kids.length
    kids.forEach(function(k) {
      this.rmr(path.join(p, k), then.bind(this))
    }.bind(this))
  }.bind(this))

  function then(er) {
    if (errState)
      return
    else if (er)
      return cb(errState = er)
    else if (--n === 0)
      return this.rmdir(p, cb)
  }
}

// if is dir: done
// if is file: eexist
// make parent
//  if (error) fail
//  make p
MultiFSClient.prototype.mkdirp = function(p, cb) {
  if (this.cleanPath(p) === this.path)
    return process.nextTick(cb)

  this.stat(p, function (er, st) {
    if (st) {
      if (st.isDirectory) {
        return cb()
      } else {
        var e = new Error('EEXIST, file already exists')
        e.path = p
        e.code = 'EEXIST'
        return cb(e)
      }
    }

    this.mkdirp(path.dirname(p), function(er) {
      if (er)
        return cb(er)
      this.mkdir(p, cb)
    }.bind(this))
  }.bind(this))
}
