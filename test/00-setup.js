var test = require('tap').test
var path = require('path')
var mkdirp = require('mkdirp')

require('./zz-cleanup.js')

test('setup', function(t) {
  for (var i = 0; i < 11; i++) {
    mkdirp.sync(path.resolve(__dirname, 'fixtures/' + i))
  }

  t.pass('ok')
  t.end()
})
