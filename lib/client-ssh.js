module.exports = MultiFSClientSSH

var MultiFSClient = require('./client-base.js')
var SSH = require('ssh2')
var url = require('url')
var util = require('util')
var path = require('path')
var once = require('once')
var stream = require('stream')

util.inherits(MultiFSClientSSH, MultiFSClient)

function MultiFSClientSSH(options) {
  MultiFSClient.call(this)
  if (typeof options === 'string') {
    var p = url.parse(options)
    if (!p.protocol) {
      options = 'ssh://' + options
      p = url.parse(options)
    }
    options = p
  }

  if (!options.path)
    options.path = ''

  if (options.auth && !options.user && !options.pass) {
    var up = options.auth.split(':')
    options.user = up.shift()
    options.pass = up.join(':')
  } else {
    options.user = process.env.USER
  }

  if (options.identity) {
    options.key = fs.readFileSync(options.identity)
  }

  this.path = options.path || ''
  if (this.path.match(/^\/:/))
    this.path = this.path.substr(2)
  else if (this.path.match(/^:/))
    this.path = this.path.substr(1)

  this.path = this.path.replace(/\/+$/, '')

  this.connection = new SSH()
  var cxn = {
    host: options.host || 'localhost',
    port: options.port || 22,
    username: options.user,
    agent: options.agent || process.env.SSH_AUTH_SOCK,
    password: options.password,
    privateKey: options.key,
    passphrase: options.passphrase,
  }
  this.connection.connect(cxn)

  this.client = null
  this.queue = []

  this.connection.on('ready', this._onConn.bind(this))
  this.connection.on('error', this.emit.bind(this, 'error'))
}

MultiFSClientSSH.prototype.destroy = function() {
  if (this.client)
    this.client.end()
  this.connection.end()
}

MultiFSClientSSH.prototype._onConn = function() {
  this.connection.sftp(function(er, sftp) {
    if (er)
      return this.emit('error', er)
    this.client = sftp
    this.client.on('error', this.emit.bind(this, 'error'))
    this.queue.forEach(function(r) {
      this[r[0]].apply(this, r[1])
    }, this)
    this.queue.length = 0
  }.bind(this))
}

MultiFSClientSSH.prototype.stat = function(p, cb) {
  if (!this.client) {
    this.queue.push(['stat', [p, cb]])
    return
  }
  p = this.cleanPath(p)
  this.client.stat(p, function (er, st) {
    if (er)
      return cb(er)
    cb(null, {
      isDirectory: st.isDirectory(),
      isFile: st.isFile()
    }, st)
  })
}

MultiFSClientSSH.prototype.readdir = function (p, cb) {
  if (!this.client) {
    this.queue.push(['readdir', [p, cb]])
    return
  }
  p = this.cleanPath(p)
  var res = []
  var raw = []
  this.client.opendir(p, function RD(er, dir) {
    if (er)
      return cb(er, res, raw)
    this.client.readdir(dir, function(er, list) {
      if (er)
        return cb(er, res, raw)
      if (list === false) {
        this.client.close(dir, function(er) {
          cb(er, res, raw)
        })
      } else {
        list.forEach(function(f) {
          if (f.filename === '.' || f.filename === '..')
            return
          raw.push(f)
          res.push(f.filename)
        })
        RD(null, dir)
      }
    })
  })
}

MultiFSClientSSH.prototype.readFile = function(p, enc, cb) {
  if (!this.client) {
    this.queue.push(['readFile', [p, enc, cb]])
    return
  }
  p = this.cleanPath(p)
  if (typeof enc === 'function') {
    cb = enc
    enc = null
  }
  var s = this.client.createReadStream(p)
  if (enc)
    s.setEncoding(enc)
  if (cb) {
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
  } else
    return s
}

MultiFSClientSSH.prototype.writeFile = function(p, data, enc, cb) {
  if (!this.client) {
    this.queue.push(['writeFile', [p, data, enc, cb]])
    return
  }
  p = this.cleanPath(p)
  if (typeof enc === 'function') {
    cb = enc
    enc = null
  }
  if (typeof data === 'string' || Buffer.isBuffer(data)) {
    var t = new stream.PassThrough()
    t.end(data, enc)
    data = t
  }
  var w = this.client.createWriteStream(p)
  if (cb) {
    cb = once(cb)
    w.on('error', cb)
    w.on('close', cb)
  }
  t.pipe(w)
}

MultiFSClientSSH.prototype.md5 = function(p, cb) {
  if (!this.client) {
    this.queue.push(['md5', [p, cb]])
    return
  }
  p = this.cleanPath(p)
  cb = once(cb)
  var cmd = 'md5 ' + JSON.stringify(p) + ' || ' +
            'md5sum ' + JSON.stringify(p)

  this.connection.exec(cmd, function (er, stream) {
    if (er)
      return cb(er)
    var stdout = ''
    var stderr = ''
    stream.setEncoding('utf8')
    stream.on('data', function(c, type) {
      if (type === 'stderr')
        stderr += c
      else
        stdout += c
    })
    stream.on('error', cb)
    var raw = {}
    stream.on('exit', function(code, signal, dumped, desc) {
      if (code === null) {
        raw.signal = signal
        raw.dumped = dumped
        raw.description = desc
      } else {
        raw.exitCode = code
      }
      if (raw.stdout !== undefined)
        done()
    })

    stream.on('end', function() {
      raw.stdout = stdout
      raw.stderr = stderr
      if (raw.exitCode !== undefined || raw.signal !== undefined)
        done()
    })

    function done() {
      stderr = raw.stderr.trim()
      stdout = raw.stdout.trim()

      if (stderr && !stdout)
        return cb(new Error(stderr), null, raw)

      if (stdout.match(/^MD5 /))
        data = stdout.split(' ').pop()
      else
        data = stdout.split(' ').shift()

      stream.end()
      cb(null, data, raw)
    }
  })
}
