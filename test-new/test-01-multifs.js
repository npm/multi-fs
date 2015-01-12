'use strict';

var
    Lab                = require('lab'),
    lab                = exports.lab = Lab.script(),
    describe           = lab.describe,
    it                 = lab.it,
    demand             = require('must'),
    MultiFS            = require('../multi-fs'),
    sinon              = require('sinon'),
    MultiFSClientFS    = require('../lib/client-fs.js'),
    MultiFSClientSSH   = require('../lib/client-ssh.js'),
    MultiFSClientSCP   = require('../lib/client-scp.js'),
    MultiFSClientManta = require('../lib/client-manta.js')
    ;

describe('MultiFS', function()
{

    var targets =
    [
        { type: 'fs', path:  '/tmp/0' },
        '/tmp/1',
        'ssh://localhost:/tmp/2',
        'scp://localhost:/tmp/3',
    ];

    lab.before(function(done)
    {
        done();
    });

    describe('constructor', function()
    {
        it('requires an array of client specs', function(done)
        {
            function shouldThrow() { return new MultiFS('foo'); }
            shouldThrow.must.throw(/array of client specs/);
            done();
        });

        it('takes a debug flag', function(done)
        {
            var mf = new MultiFS([], true);
            mf.must.have.property('_debug');
            mf._debug.must.equal(true);
            done();
        });

        it('turns client specs to client objects', function(done)
        {
            var mf = new MultiFS(targets);

            mf.must.have.property('_clients');
            mf._clients.must.be.an.array();
            mf._clients.must.eql(targets);

            mf.must.have.property('clients');
            mf.clients.must.be.an.array();
            mf.clients.length.must.equal(targets.length);

            done();
        });

        it('sets a handy name', function(done)
        {
            var mf = new MultiFS(targets);
            mf.must.have.property('name');
            mf.name.must.be.a.string();

            done();
        });

        it('implements all the required base client functions', function(done)
        {
            var methods = [
                'destroy', 'stat', 'rmr', 'readdir', 'readFile',
                'md5', 'mkdir', 'rmdir', 'unlink', 'rename', 'mkdirp', 'writeFile'
                ];

            var mf = new MultiFS([]);
            methods.forEach(function(m)
            {
                mf.must.have.property(m);
                mf[m].must.be.a.function();
            });

            done();
        });
    });

    describe('setupClient', function()
    {
        it('handles the text fs spec', function(done)
        {
            var mf = new MultiFS(['/tmp/1']);
            mf._clients.length.must.equal(1);
            var c = mf.clients[0];

            c.must.be.instanceof(MultiFSClientFS);

            done();
        });

        it('handles the object fs spec', function(done)
        {
            var mf = new MultiFS([{ type: 'fs', path:  '/tmp/0' }]);
            mf._clients.length.must.equal(1);
            var c = mf.clients[0];

            c.must.be.instanceof(MultiFSClientFS);

            done();
        });

        it('handles the text ssh spec', function(done)
        {
            var mf = new MultiFS(['ssh://localhost:/tmp/2']);
            mf._clients.length.must.equal(1);
            var c = mf.clients[0];

            c.must.be.instanceof(MultiFSClientSSH);

            done();
        });

        it('handles the object ssh spec', function(done)
        {
            var mf = new MultiFS([{ type: 'ssh', path: '/tmp/7', host: 'localhost', user: process.env.USER }]);
            mf._clients.length.must.equal(1);
            var c = mf.clients[0];

            c.must.be.instanceof(MultiFSClientSSH);

            done();
        });

        it('handles the text scp spec', function(done)
        {
            var mf = new MultiFS(['scp://localhost:/tmp/3']);
            mf._clients.length.must.equal(1);
            var c = mf.clients[0];

            c.must.be.instanceof(MultiFSClientSCP);

            done();
        });

        it('handles the object scp spec', function(done)
        {
            var mf = new MultiFS([{ type: 'scp', path: '/tmp/7', host: 'localhost', user: process.env.USER }]);
            mf._clients.length.must.equal(1);
            var c = mf.clients[0];

            c.must.be.instanceof(MultiFSClientSCP);

            done();
        });

        if (process.env.MANTA_KEY_ID)
        {
            it('handles the double twiddle manta spec', function(done)
            {
                var mf = new MultiFS(['~~/tmp/4']);
                mf._clients.length.must.equal(1);
                var c = mf.clients[0];

                c.must.be.instanceof(MultiFSClientManta);

                done();
            });

            it('handles the manta: manta spec', function(done)
            {
                var mf = new MultiFS(['manta:/tmp/5']);
                mf._clients.length.must.equal(1);
                var c = mf.clients[0];
                c.must.be.instanceof(MultiFSClientManta);

                done();
            });

            it('handles the object manta spec', function(done)
            {
                var mf = new MultiFS([{ type: 'manta', path: '/tmp/6'}]);
                mf._clients.length.must.equal(1);
                var c = mf.clients[0];
                c.must.be.instanceof(MultiFSClientManta);

                done();
            });
        }
    });
});
