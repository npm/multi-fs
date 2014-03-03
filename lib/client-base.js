module.exports = MultiFSClient
var path = require('path')
var util = require('util')
var EE = require('events').EventEmitter
util.inherits(MultiFSClient, EE)
function MultiFSClient() {
  EE.call(this)
}

MultiFSClient.prototype.destroy = function() {}

MultiFSClient.prototype.cleanPath = function(p) {
  return (this.path + path.join('/', p)).replace(/\/+$/, '')
}

MultiFSClient.prototype.rmr = function(p, cb) {
  p = this.cleanPath(p)
  this.stat(p, function(er, st) {
    if (er)
      return cb(er)
    if (st.isDirectory)
      rmKids(this, p, cb)
    else
      this.unlink(p, cb)
  }.bind(this))
}

function rmKids(self, p, cb) {
  p = self.cleanPath(p)
  var n, errState

  self.readdir(p, function(er, kids) {
    if (er)
      return cb(er)

    if (kids.length === 0)
      return self.rmdir(p, cb)

    n = kids.length
    kids.forEach(function(k) {
      self.rmr(path.join(p, k), then)
    })
  })

  function then(er) {
    if (errState)
      return
    else if (er)
      return cb(errState = er)
    else if (--n === 0)
      return self.rmdir(p, cb)
  }
}

// if is dir: done
// if is file: eexist
// make parent
//  if (error) fail
//  make p
MultiFSClient.prototype.mkdirp = function(p, cb) {
  p = this.cleanPath(p)

  if (p === this.path)
    return cb()

  this.stat(p, function (er, st) {
    if (st) {
      if (st.isDirectory)
        return cb()
      else {
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
    }).bind(this)
  }.bind(this))
}
