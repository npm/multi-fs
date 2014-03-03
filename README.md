# multi-fs

A client for doing FS operations in multiple places in sync.

Current supported targets:

1. File system root paths
2. Remote unix systems (via ssh)

Planned supported targets:

1. Joyent Manta
2. Rackspace Cloud Files
3. Amazon S3

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
  }
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

TODO:

* `createReadStream(path, cb)`

Writing functions:

* `writeFile(path, data, [encoding], cb)`
* `rmr(path, cb)`
* `mkdirp(path, cb)`
* `mkdir(path, cb)`
* `unlink(path, cb)`
* `rmdir(path, cb)`

TODO:

* `createWriteStream(path, cb)`

### Results

Callbacks are called with the following arguments:

* `error` First error encountered.  If no errors are encountered, but
  the data returned is not consistent, then it will return an
  'Inconsistent Data' error.
* `result`  The result of the operation.  If consistent results are
  not found, then this will be set to null.
* `data`  Errors, results, and extra metadata from all hosts.
