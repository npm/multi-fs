module.exports = MultiFSClientFS

var MultiFSClient = require('./client-base.js')
var util = require('util')
var path = require('path')
var fs = require('fs')
var path = require('path')
var stream = require('stream')
var once = require('once')
var crypto = require('crypto')

util.inherits(MultiFSClientFS, MultiFSClient)

function MultiFSClientFS(p) {
  MultiFSClient.call(this)
  this.path = p.replace(/^\~/, process.env.HOME).replace(/\/+$/, '')
}

MultiFSClientFS.prototype.stat = function (p, cb) {
  p = this.cleanPath(p)
  fs.stat(p, function (er, st) {
    if (er)
      return cb(er)
    cb(null, {
      isDirectory: st.isDirectory(),
      isFile: st.isFile()
    })
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
  if (!cb) {
    var s = fs.createReadStream(p)
    if (enc)
      s.setEncoding(enc)
    return s
  } else
    fs.readFile(p, enc, cb)
}

MultiFSClientFS.prototype.writeFile = function (p, data, enc, cb) {
  p = this.cleanPath(p)
  if (typeof data === 'object' && data instanceof stream.Readable) {
    var w = fs.createWriteStream(p)
    if (cb) {
      cb = once(cb)
      w.on('error', cb)
      w.on('close', cb)
    }
    data.pipe(w)
  } else
    fs.writeFile(p, data, enc, cb)
}

MultiFSClientFS.prototype.mkdir = function (p, cb) {
  p = this.cleanPath(p)
  fs.mkdir(p, cb)
}

MultiFSClientFS.prototype.readdir = function (p, cb) {
  p = this.cleanPath(p)
  fs.readdir(p, cb)
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
