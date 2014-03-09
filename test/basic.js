var test = require('tap').test
var MF = require('../multi-fs.js')
var path = require('path')

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
    '~~/stor/multi-fs-testing/9',
    'manta:/' + process.env.MANTA_USER + '/stor/multi-fs-testing/10',

    {
      path: '~~/stor/multi-fs-testing/11',
      type: 'manta',
      env: {},
      argv: [
        '-a', process.env.MANTA_USER,
        '-k', process.env.MANTA_KEY_ID,
        '-u', process.env.MANTA_URL
      ]
    },
    {
      path: '~~/stor/multi-fs-testing/12',
      type: 'manta',
      argv: [],
      env: {
        MANTA_USER: process.env.MANTA_USER,
        MANTA_KEY_ID: process.env.MANTA_KEY_ID,
        MANTA_URL: process.env.MANTA_URL
      }
    }
  ]

  mf = new MF(targets)
  t.pass('made mf')
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
  mf.writeFilep('a/x/y/z/foo', 'bar\n', 'ascii', function(er, res, data) {
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
      t.equal(res, 'bar\n')
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

test('unlink', function(t) {
  console.error('unlink')
  mf.unlink('a/b/c/foo', function(er, res, data) {
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
