var test = require('tap').test
var MF = require('../multi-fs.js')
var path = require('path')
var fs = require('fs')

var base = path.resolve(__dirname, 'fixtures')

test("only uploads to one random client",function(t){

  var path1 = __dirname+'/fixtures/0'
  var path2 = __dirname+'/fixtures/1'


  var client = new MF([path1,path2])

  var f = Date.now()+'rr'

  client.justOne('writeFilep',[f,'sup'],function(err,data){
    t.ok(!err,'should npot have error')

    var written = fs.readFileSync(path.join(this.name,f))+''

    t.equals(written,'sup','should have written correct data')

    t.equals(fs.existsSync(path.join(path1 === this.name?path2:path1,f)),false,"the file should not exist for the other client")

    t.end()
  })

})
