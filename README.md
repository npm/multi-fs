# multi-fs

A client for doing FS operations in multiple places in sync.

Current supported targets:

1. File system root paths
2. Remote unix systems (via ssh)
3. Joyent Manta

Planned supported targets:

1. Rackspace Cloud Files
2. Amazon S3

[![on npm](http://img.shields.io/npm/v/multi-fs.svg?style=flat)](https://www.npmjs.org/package/multi-fs)  [![Dependencies](http://img.shields.io/david/npm/multi-fs.svg?style=flat)](https://david-dm.org/izs/multi-fs)


## USAGE

```javascript
var MultiFS = require("multi-fs")
var client = new MultiFS([
  // FS is the default type
  "/path/to/some/stuff",

  // ssh urls are desugared
  "ssh://user@host:path/in/home",

  // setting special ssh options requires using
  // the full object style, though.
  {
    type: "ssh",
    host: "some-host",
    user: "some-user",
    identity: "/home/.ssh/id_rsa_some_key",
    path: "path/in/home"
  },

  // manta can be either an existing manta client,
  // or an args/env pair, which will use the standard
  // manta arguments and environment stuff.
  {
    type: "manta",
    path: "~~/stor/root/path",

    // alternative:   "client": myMantaClient,
    args: [ "-a", "username" ],
    env: { MANTA_KEY_ID: process.env.MANTA_KEY_ID, etc }
  },

  // you can use a variant of the ssh client that does file
  // copies by spawning scp. the options are identical to ssh
  {
    type: "scp",
    host: "some-host",
    user: "some-user",
    identity: "/home/.ssh/id_rsa_some_key",
    path: "path/in/home"
  },
  "scp://user@host:path/in/home",
])

// Paths are not allowed to traverse up past the parent.
client.readdir("foo/bar", function (er, files) {
  if (er) {
    console.log("it failed!")
  } else {
    console.log("results:", files)
  }
})
```

## Methods

All methods take `cb` as their last argument.

Reading functions:

* `stat(path, cb)`
* `readdir(path, cb)`
* `readFile(path, [encoding], cb)`
* `md5(path, cb)`

Writing functions:

* `writeFile(path, data, [encoding], cb)`
* `rmr(path, cb)`
* `mkdirp(path, cb)`
* `mkdir(path, cb)`
* `unlink(path, cb)`
* `rmdir(path, cb)`

### Results

Callbacks are called with the following arguments:

* `error` First error encountered.  If no errors are encountered, but
  the data returned is not consistent, then it will return an
  'Inconsistent Data' error.
* `result`  The result of the operation.  If consistent results are
  not found, then this will be set to null.
* `data`  Errors, results, and extra metadata from all hosts.

For all methods except `readfile`, it performs the operation on all
targets, and will raise an `Inconsistent Data` error if they do not
return matching results.

For `readfile`, it will call `md5` and compare hashes, and then, if
the results all match, it will read the actual file from the first
client that returned an md5 hash.

## Streams

I think it'd be great to have `createReadStream(p, cb)` and
`createWriteStream(p, cb)` methods on the client, especially since all
the targets (fs, ssh2, manta, etc.) support streams already.

However, especially for readable streams, it's not at all clear how to
handle inconsistencies.  Right now, `readFile` will raise an
`Inconsistent Data` error if two hosts return different stuff.
However, with a readable stream, it'd have to be checking each chunk
somehow, and that gets pretty complicated.

Probably that "check multiple streams and make sure they're all
producing the same data" thing should be a separate module.

For writable streams, it's a bit easier, since it's just a
multiplexing pipe thing, but hasn't been done at this time.
