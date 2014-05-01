module.exports = MultiFSClientManta

var MultiFSClient = require('./client-base.js')
var crypto = require('crypto')
var fs     = require('fs')
var once   = require('once')
var path   = require('path')
var stream = require('stream')
var util   = require('util')

var createClient = require('manta-client')

util.inherits(MultiFSClientManta, MultiFSClient)

function MultiFSClientManta(options) {
  MultiFSClient.call(this)

  if (typeof options === 'string')
    options = { path: options }

  this.path = options.path
  var argv = options.argv || process.argv
  var env = options.env || process.env
  this.client = new createClient(argv, env)

  this.path = this.path
    .replace(/\/+$/, '')
    .replace(/^manta:/, '')
    .replace(/^~~/, '/' + this.client.user)
}

MultiFSClientManta.prototype.destroy = function() {
  this.client.close()
}

MultiFSClientManta.prototype.stat = function(p, cb) {
  p = this.cleanPath(p)
  this.client.info(p, function(er, info) {
    if (er) {
      if (er.statusCode === 404)
        er.code = 'ENOENT'
      return cb(er)
    }
    var res = {}
    if (info.type === 'application/x-json-stream; type=directory') {
      res.isDirectory = true
      res.isFile = false
    } else {
      res.isFile = true
      res.isDirectory = false
    }
    cb(er, res, info)
  })
}

MultiFSClientManta.prototype.mkdir = function(p, cb) {
  p = this.cleanPath(p)
  this.client.mkdir(p, {}, cb);
}

MultiFSClientManta.prototype.mkdirp = function(p, cb) {
  p = this.cleanPath(p)
  this.client.mkdirp(p, {}, cb);
}

MultiFSClientManta.prototype.unlink = function(p, cb) {
  p = this.cleanPath(p)
  this.client.info(p, function(er, info) {
    if (er) {
      if (er.statusCode === 404)
        er.code = 'ENOENT'
      return cb(er)
    }
    if (info.type === 'application/x-json-stream; type=directory') {
      er = new Error('Cannot unlink directory')
      er.code = 'EISDIR'
      return cb(er, null, info)
    }
    this.client.unlink(p, function(er, res) {
      cb(er, undefined, info)
    })
  }.bind(this))
}

MultiFSClientManta.prototype.rmdir = function(p, cb) {
  p = this.cleanPath(p)

  this.client.info(p, function(er, info) {
    if (er) {
      if (er.statusCode === 404)
        er.code = 'ENOENT'
      return cb(er)
    }
    if (info.type !== 'application/x-json-stream; type=directory') {
      er = new Error('Cannot rmdir file')
      er.code = 'ENOTDIR'
      return cb(er, null, info)
    }
    this.client.unlink(p, function(er, res) {
      cb(er, undefined, info)
    })
  }.bind(this))
}

MultiFSClientManta.prototype.rmr = function(p, cb) {
  p = this.cleanPath(p)
  this.client.rmr(p, cb)
}

MultiFSClientManta.prototype.readFile = function(p, enc, cb) {
  p = this.cleanPath(p)
  if (typeof enc === 'function') {
    cb = enc
    enc = null
  }
  this.client.get(p, function (er, s) {
    if (er)
      return cb(er)

    if (enc)
      s.setEncoding(enc)

    var coll = enc ? '' : []
    var len = 0
    s.on('data', function(d) {
      if (enc)
        coll += d
      else {
        len += d.length
        coll.push(d)
      }
    })
    s.on('end', function() {
      if (!enc)
        coll = Buffer.concat(coll, len)
      cb(null, coll)
    })
  });
}

MultiFSClientManta.prototype.writeFile = function(p, data, enc, cb) {
  p = this.cleanPath(p)
  if (typeof enc === 'function') {
    cb = enc
    enc = null
  }

  var st
  if (typeof data === 'object' && data instanceof stream.Readable) {
    st = data
  } else {
    st = new stream.PassThrough()
    st.end(data, enc)
    if (cb) {
      cb = once(cb)
      st.on('error', cb)
    }
  }

  var out = this.client.createWriteStream(p)
  out.once('end', cb)
  out.on('error', function(er) {
    cb(er)
  })
  st.pipe(out);
}

MultiFSClientManta.prototype.readdir = function(p, cb) {
  p = this.cleanPath(p)
  var ret = []
  var raw = []
  function push(obj) {
    ret.push(obj.name)
    raw.push(obj)
  }
  this.client.ls(p, {}, function(er, res) {
    cb = once(cb)
    if (er) {
      if (er.name === 'InvalidDirectoryError')
        er.code = 'ENOTDIR'
      var info = er.info
      delete er.info
      return cb(er, null, info)
    }
    res.on('directory', push)
    res.on('object', push)
    res.once('error', cb);
    res.on('end', function() {
      cb(null, ret, raw)
    })
  })
}

MultiFSClientManta.prototype.md5 = function(p, cb) {
  p = this.cleanPath(p)
  this.client.info(p, function(er, info) {
    if (er) {
      if (er.statusCode === 404)
        er.code = 'ENOENT'
      return cb(er, null, info)
    }
    if (info.type === 'application/x-json-stream; type=directory') {
      er = new Error('Cannot md5 a directory')
      er.code = 'EISDIR'
      return cb(er, null, info)
    }
    var md5 = new Buffer(info.md5, 'base64').toString('hex')
    cb(er, md5, info)
  })
}
