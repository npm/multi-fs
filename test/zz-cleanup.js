var test = require('tap').test
var path = require('path')
var rimraf = require('rimraf')
var mpath = '~~/stor/multi-fs-testing'

test('cleanup fs', function(t) {
  rimraf.sync(path.resolve(__dirname, 'fixtures'))
  t.pass('ok')
  t.end()
})
