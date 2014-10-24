module.exports = MultiFSClient

var crypto = require('crypto')
var EE   = require('events').EventEmitter
var path = require('path')
var stream = require('stream')
var util = require('util')

function MultiFSClient() {
  EE.call(this)
  if (/\bmfs\b/.test(process.env.NODE_DEBUG || ''))
    this._debug = true
}
util.inherits(MultiFSClient, EE)

MultiFSClient._debug = false
MultiFSClient.name = ''

MultiFSClient.prototype.close = function() {
  this.destroy()
}
MultiFSClient.prototype.destroy = function() {}

MultiFSClient.prototype.debug = function() {
  if (this._debug) {
    // TODO dtrace probes or whatever
    var m = util.format.apply(util, arguments)
    console.error('%s<%s> %s', this.constructor.name, this.name, m)
  }
}

MultiFSClient.prototype.cleanPath = function(p) {
  if (p.indexOf(this.path) === 0) return p
  return (this.path + path.join('/', p)).replace(/\/+$/, '')
}

MultiFSClient.prototype.writeFilep = function (f, data, enc, cb) {
  if (typeof enc === 'function') {
    cb = enc
    enc = null
  }
  this.mkdirp(path.dirname(f), function(er, res, raw) {
    if (er)
      return cb(er, res, raw)
    this.writeFile(f, data, enc, cb)
  }.bind(this))
}

var makeTmpName = MultiFSClient.makeTmpName = function makeTmpName(original, cb) {
  crypto.randomBytes(4, function(err, buffer) {
    if (err) return cb(err)
    cb(null, original + '.TMP.' + buffer.toString('hex'))
  })
}

MultiFSClient.prototype.writeFile = function(dest, data, enc, cb) {
  var t
  dest = this.cleanPath(dest)
  if (typeof enc === 'function') {
    cb = enc
    enc = null
  }

  if (typeof data === 'string' || Buffer.isBuffer(data)) {
    t = new stream.PassThrough()
    t.end(data, enc)
    data = t
  } else if (typeof data === 'object' && data instanceof stream.Readable) {
    t = data
  } else {
    throw new TypeError(typeof data + ' not valid input to writeFile')
  }

  var pt = new stream.PassThrough()
  t.pipe(pt)

  makeTmpName(dest, function(err, tmpfile) {
    if (err) return cb(err)
    this._writeFileCore(tmpfile, pt, enc, function(err) {
      // Best effort removal of temp file on write failure
      if (err) return this.unlink(tmpfile, function(err2) {
        return cb(err, null, err2)
      })
      this.rename(tmpfile, dest, cb)
    }.bind(this))
  }.bind(this))
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
