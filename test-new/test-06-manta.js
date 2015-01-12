'use strict';

var
    Lab      = require('lab'),
    lab      = exports.lab = Lab.script(),
    describe = lab.describe,
    it       = lab.it,
    demand   = require('must'),
    MultiFS  = require('../multi-fs')
    ;

describe('manta client', function()
{
    lab.before(function(done)
    {
        done();
    });

    describe('constructor', function()
    {
        it('demands an options object', function(done)
        {
            done();
        });
    });

});
