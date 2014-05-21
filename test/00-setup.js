var test = require('tap').test
var path = require('path')
var mkdirp = require('mkdirp')
var createClient = require('manta-client')
var mpath = '~~/stor/multi-fs-testing'

require('./zz-cleanup.js')

test('setup', function(t) {
  for (var i = 0; i < 11; i++) {
    mkdirp.sync(path.resolve(__dirname, 'fixtures/' + i))
  }
  t.pass('ok')
  t.end()
})

test('manta setup', function(t) {
  var client = createClient()
  var need = 0
  for (var i = 9; i < 12; i++) (function(i) {
    need++
    client.mkdirp(mpath + '/' + i, done)
  })(i)

  function done(er) {
    if (er)
      throw er
    if (--need === 0) {
      t.pass('made all dirs')
      t.end()
      client.close()
    }
  }
})
