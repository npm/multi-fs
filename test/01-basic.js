var test = require('tap').test
var MF = require('../multi-fs.js')
var path = require('path')
var fs = require('fs')

var base = path.resolve(__dirname, 'fixtures')

var cwd = process.cwd()
var locshort = base
if (cwd && base.indexOf(cwd) === 0)
  locshort = base.substr(cwd.length).replace(/^\/+/, '')

var home = process.env.HOME
var homeshort = base
if (home && base.indexOf(home) === 0)
  homeshort = base.substr(home.length).replace(/^\/+/, '')

var mf

test('make mf', function(t) {
  var targets = [
    { type: 'fs', path: base + '/0' },
    { type: 'fs', path: locshort + '/1' },
    base + '/2',
    locshort + '/3',
    '~/' + homeshort + '/4',
    'ssh://localhost:' + homeshort + '/5',
    'ssh://localhost' + base + '/6',
    {
      type: 'ssh',
      agent: process.env.SSH_AUTH_SOCK,
      path: homeshort + '/7'
    },
    {
      type: 'ssh',
      agent: process.env.SSH_AUTH_SOCK,
      path: base + '/8'
    },
    {
      path: homeshort + '/9',
      type: 'scp',
      user: process.env.USER,
      host: 'localhost'
    },
    'scp://localhost:' + base + '/10'
  ]

  mf = new MF(targets)
  t.pass('made mf')
  t.end()
})

test('cleanPath can be safely called twice', function(t) {
  var Base = require('../lib/client-base')
  var client = new Base()
  client.path = '/path/start'
  var testp = 'whatever'
  var res1 = client.cleanPath(testp)
  var res2 = client.cleanPath(res1)
  t.equal(res1, res2)
  t.end()
})

test('mkdirp', function(t) {
  mf.mkdirp('a/b/c/d/e/f', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, undefined)
    t.end()
  })
})

test('rmr', function(t) {
  mf.rmr('a/b/c/d', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, undefined)
    t.end()
  })
})

test('writeFilep', function(t) {
  mf.writeFilep('a/x/y/z/foo', 'new content\n', 'ascii', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, undefined)
    t.end()
  })
})

test('writeFile', function(t) {
  mf.writeFile('a/b/c/foo', 'bar\n', 'ascii', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, undefined)
    t.end()
  })
})

test('writeFile stream input', function(t) {
  var source = fs.createReadStream(path.resolve(__dirname, 'cat_in_a_box.jpg'), 'binary')
  mf.writeFile('/a/b/c/stream', source, 'binary', function(er, res, data) {
    if (er) throw er
    t.equal(res, undefined)
    mf.stat('/a/b/c/stream', function(err, res, data) {
      if (er) {
        console.error(er, res, data)
        throw er
      }
      t.same(res, { isFile: true, isDirectory: false })
      data.extra.forEach(function(extra) {
        t.equal(extra.size, 35927)
      })
      t.end()
    })
  })
})

test('stat', function(t) {
  var n = 2

  mf.stat('a/b/c/foo', function(er, res, data) {
    if (er) {
      console.error(er, res, data)
      throw er
    }
    t.same(res, { isFile: true, isDirectory: false })
    if (--n === 0)
      t.end()
  })

  mf.stat('a/b/c', function(er, res, data) {
    if (er) {
      console.error(er, res, data)
      throw er
    }
    t.same(res, { isFile: false, isDirectory: true })
    if (--n === 0)
      t.end()
  })
})

test('readFile', function(t) {
  mf.readFile('a/b/c/foo', 'ascii', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, 'bar\n')
    mf.readFile('a/x/y/z/foo', 'ascii', function(er, res, data) {
      if (er)
        throw er
      t.equal(res, 'new content\n')
      t.end()
    })
  })
})

test('md5', function(t) {
  mf.md5('a/b/c/foo', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, 'c157a79031e1c40f85931829bc5fc552')
    t.end()
  })
})

test('rename', function(t) {
  mf.rename('a/b/c/foo', 'a/b/c/bar', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, undefined)
    t.end()
  })
})

test('rename blows away the destination', function(t) {
    mf.rename('a/x/y/z/foo', 'a/b/c/bar', function(er, res, data) {
      if (er) throw er
      mf.readFile('a/b/c/bar', 'ascii', function(er, res, data) {
        if (er) throw er
        t.equal(res, 'new content\n')
        t.pass('rename force')
        t.end()
      })
    })
})

test('unlink', function(t) {
  mf.unlink('a/b/c/bar', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, undefined)
    t.end()
  })
})

test('close', function(t) {
  mf.destroy()
  t.pass('destroyed')
  t.end()
})
