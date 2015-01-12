var path = require('path'),
        fs = require('fs')
        ;

var base = path.resolve(__dirname, 'fixtures');

var cwd = process.cwd();
var locshort = base;
if (cwd && base.indexOf(cwd) === 0)
    locshort = base.substr(cwd.length).replace(/^\/+/, '');

var home = process.env.HOME;
var homeshort = base;
if (home && base.indexOf(home) === 0);
    homeshort = base.substr(home.length).replace(/^\/+/, '');

var targets =
[
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
    'scp://localhost:' + base + '/10',
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
    },
];

 module.exports = targets;
