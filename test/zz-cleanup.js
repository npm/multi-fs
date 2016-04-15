var test = require('tap').test
var path = require('path')
var rimraf = require('rimraf')
var mpath = '~~/stor/multi-fs-testing'
var createClient = require('manta-client')

test('cleanup fs', function(t) {
  rimraf.sync(path.resolve(__dirname, 'fixtures'))
  t.pass('ok')
  t.end()
})

/*
test('clean fishes', function(t) {
  var client = createClient()
  client.rmr(mpath, function(er) {
    client.close()
    t.pass('cleaned')
    t.end()
  })
})
*/
