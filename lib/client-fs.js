module.exports = MultiFSClientFS

var MultiFSClient = require('./client-base.js')
var crypto = require('crypto')
var fs     = require('fs')
var once   = require('once')
var path   = require('path')
var stream = require('stream')
var util   = require('util')

util.inherits(MultiFSClientFS, MultiFSClient)

function MultiFSClientFS(p) {
  MultiFSClient.call(this)
  if (typeof p === 'object') {
    p = p.path
  }

  if (/\bmfs(fs)?\b/.test(process.env.NODE_DEBUG || ''))
    this._debug = true

  if (!p && p !== '')
    throw new TypeError('No path provided')

  this.path = p.replace(/^\~/, process.env.HOME).replace(/\/+$/, '')
  this.path = path.resolve(this.path)
  this.name = this.path
}

MultiFSClientFS.prototype.stat = function (p, cb) {
  p = this.cleanPath(p)
  fs.stat(p, function (er, st) {
    if (er)
      return cb(er)
    cb(null, {
      isDirectory: st.isDirectory(),
      isFile: st.isFile()
    }, st)
  })
}

MultiFSClientFS.prototype.unlink = function (p, cb) {
  p = this.cleanPath(p)
  fs.unlink(p, cb)
}

MultiFSClientFS.prototype.rmdir = function (p, cb) {
  p = this.cleanPath(p)
  fs.rmdir(p, cb)
}

MultiFSClientFS.prototype.readFile = function (p, enc, cb) {
  p = this.cleanPath(p)
  if (typeof enc === 'function') {
    cb = enc
    enc = null
  }
  fs.readFile(p, enc, cb)
}

MultiFSClientFS.prototype._writeFileCore = function (p, data, enc, cb) {
  var t

  var w = fs.createWriteStream(p)
  if (cb) {
    cb = once(cb)
    w.on('error', cb)
    w.on('finish', cb)
  }
  data.pipe(w)
}

MultiFSClientFS.prototype.mkdir = function (p, cb) {
  p = this.cleanPath(p)
  this.debug('fs.mkdir %j', p)
  fs.mkdir(p, cb)
}

MultiFSClientFS.prototype.readdir = function (p, cb) {
  p = this.cleanPath(p)
  fs.readdir(p, function (er, res) {
    cb(er, (res || []).sort())
  })
}

MultiFSClientFS.prototype.md5 = function (p, cb) {
  p = this.cleanPath(p)
  cb = once(cb)
  var md5 = crypto.createHash('md5')
  fs.createReadStream(p)
    .on('error', cb)
    .pipe(md5)
    .on('error', cb)
    .on('data', cb.bind(null, null))
    .setEncoding('hex')
}

MultiFSClientFS.prototype.rename = function(src, dest, cb) {
  src = this.cleanPath(src)
  dest = this.cleanPath(dest)
  fs.rename(src, dest, cb)
}
