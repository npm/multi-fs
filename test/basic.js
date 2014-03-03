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
    '~/' + homeshort,
    'ssh://localhost:' + homeshort + '/4',
    'ssh://localhost' + base + '/5',
    {
      type: 'ssh',
      agent: process.env.SSH_AUTH_SOCK,
      path: homeshort + '/6'
    },
    {
      type: 'ssh',
      agent: process.env.SSH_AUTH_SOCK,
      path: base + '/7'
    }
  ]

  mf = new MF(targets)
  t.pass('made mf')
  t.end()
})

test('writeFile', function(t) {
  mf.writeFile('foo', 'bar\n', 'ascii', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, undefined)
    t.end()
  })
})

test('readFile', function(t) {
  mf.readFile('foo', 'ascii', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, 'bar\n')
    t.end()
  })
})

test('md5', function(t) {
  mf.md5('foo', function(er, res, data) {
    if (er)
      throw er
    t.equal(res, 'c157a79031e1c40f85931829bc5fc552')
    t.end()
  })
})

test('close', function(t) {
  mf.destroy()
  t.pass('destroyed')
  t.end()
})
