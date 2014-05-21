
var
    MultiFSClientSSH = require('./client-ssh.js'),
    assert           = require('assert'),
    fs               = require('fs'),
    once             = require('once'),
    path             = require('path'),
    spawn            = require('child_process').spawn
    stream           = require('stream'),
    tmp              = require('tmp'),
    url              = require('url'),
    util             = require('util')
;

module.exports = MultiFSClientSCP


function MultiFSClientSCP(options) {
    assert(options && (typeof options == 'object', 'SCP client requires an options object'))
    assert(options.user && (typeof options.user == 'string'), 'SCP client requires a string `user` option')
    assert(options.host && (typeof options.host == 'string'), 'SCP client requires a string `host` option')

    this.scpBase = options.user + '@' + options.host + ':'
    MultiFSClientSSH.call(this, options)
}
util.inherits(MultiFSClientSCP, MultiFSClientSSH)

MultiFSClientSCP.prototype.user = null            // remote user
MultiFSClientSCP.prototype.host = null            // remote host
MultiFSClientSCP.prototype.port = null            // remote port
MultiFSClientSCP.prototype.identity = null    // identity file to pass through to ssh

MultiFSClientSCP.prototype.writeFile = function writeFileSCP(p, data, enc, cb) {
    if (!this.client) {
        this.queue.push(['writeFile', [p, data, enc, cb]])
        return
    }

    var tmpfile
    var t
    p = this.cleanPath(p)
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

    var doSCP = function doSCP() {
        var opts = [tmpfile, this.scpBase + p]
        if (this.identity) {
            opts.push('-i')
            opts.push(this.identity)
        }
        var proc = spawn('scp', opts)

        proc.stdout.on('data', function(data) {
            if (this.debug) console.log(data.toString())
        }.bind(this))
        proc.stderr.on('data', function(data) {
            if (this.debug) console.error('ERR: ', data.toString())
        }.bind(this))
        proc.on('close', function(code) {
            fs.unlinkSync(tmpfile)
            if (code !== 0)
                cb(new Error('exited with status code ' + code))
            else
                cb()
        })
    }.bind(this)

    tmp.tmpName({ template: '/tmp/tmp-XXXXXX' }, function(err, tmppath) {
        if (err) return cb(err)
        tmpfile = tmppath
        var tstream = fs.createWriteStream(tmpfile)
        tstream.on('error', cb)
        tstream.on('close', doSCP)

        t.pipe(tstream)
    });
}
