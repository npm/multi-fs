var
  MultiFSClientSSH = require('./client-ssh.js'),
  assert           = require('assert'),
  fs               = require('fs'),
  once             = require('once'),
  path             = require('path'),
  spawn            = require('child_process').spawn,
  stream           = require('stream'),
  tmp              = require('tmp'),
  url              = require('url'),
  util             = require('util')
;

module.exports = MultiFSClientSCP

function MultiFSClientSCP(options) {
  assert(options, 'SCP client requires an options object or string')

  if (typeof options == 'object') {
    assert(options.user && (typeof options.user == 'string'), 'SCP client requires a string `user` option')
    assert(options.host && (typeof options.host == 'string'), 'SCP client requires a string `host` option')
  } else if (typeof options == 'string') {
    var p = url.parse(options)
    if (!p.protocol) {
      options = 'scp://' + options
      p = url.parse(options)
    }
    options = p
  }

  MultiFSClientSSH.call(this, options)
  this.strictHostKeyChecking = options.strictHostKeyChecking
  this.scpBase = options.user + '@' + options.host + ':'
}

// prevent parent class from connecting. =)
MultiFSClientSCP.prototype.connect = function(){

}

util.inherits(MultiFSClientSCP, MultiFSClientSSH)

MultiFSClientSCP.prototype.user = null      // remote user
MultiFSClientSCP.prototype.host = null      // remote host
MultiFSClientSCP.prototype.port = null      // remote port
MultiFSClientSCP.prototype.identity = null  // identity file to pass through to ssh
MultiFSClientSCP.prototype.strictHostKeyChecking = true

MultiFSClientSCP.prototype._scpToTmpFile = function _scpToTmpFile(p, tmpfile, cb) {
  p = this.scpBase + p
  var opts = []
  if (this.identity) {
    opts.push('-i')
    opts.push(this.identity)
  }

  if (typeof this.strictHostKeyChecking !== 'undefined') {
    opts.push('-o')
    opts.push('StrictHostKeyChecking=' + (this.strictHostKeyChecking ? 'yes' : 'no'))
  }

  opts.push(tmpfile, p)

  var proc = spawn('scp', opts)

  proc.stdout.on('data', function(data) { if (this.debug) console.log(data.toString()) }.bind(this))
  proc.stderr.on('data', function(data) { if (this.debug) console.error('ERR: ', data.toString()) }.bind(this))

  proc.on('close', function(code) {
    fs.unlink(tmpfile, function(err) {
      if (code !== 0)
        cb(new Error('exited with status code ' + code))
      else
        cb(err)
    })
  })
}

MultiFSClientSCP.prototype._writeFileCore = function writeFileSCP(p, incoming, enc, cb) {
  if (!this.client) {
    this.queue.push(['_writeFileCore', [p, incoming, enc, cb]])
    return
  }
  var tmpfile
  var pt = new stream.PassThrough()
  incoming.pipe(pt)

  tmp.tmpName(function(err, tmppath) {
    if (err) return cb(err)
    tmpfile = tmppath
    var tstream = fs.createWriteStream(tmpfile)
    tstream.on('error', cb)
    tstream.once('close', this._scpToTmpFile.bind(this, p, tmpfile, cb))

    pt.pipe(tstream)
  }.bind(this));
}
