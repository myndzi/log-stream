var assert = require('assert'),
    should = require('should'),
    Stream = require('stream'),
    Promise = require('bluebird');

var LogStream = require('../log-stream');

describe('LogStream', function () {
    function dumy(obj) {
        obj = obj || { };
        
        var statmock = { size: 1413 };

        return {
            maxSize: obj.maxSize || 10,
            stat: Promise.method(function () {
                return obj.stat ? obj.stat.apply(null, arguments) : statmock;
            }),
            readDir: Promise.method(function () {
                if (obj.files) { return obj.files; }
                return obj.readDir ? obj.readDir.apply(null, arguments) : [ ];
            }),
            createWriteStream: function () {
                if (obj.stream) { return obj.stream; }
                if (obj.streams) { return obj.streams.shift(); }
                return (
                    obj.createWriteStream ?
                    obj.createWriteStream.apply(null, arguments) :
                    new Stream.PassThrough()
                );
            },
            rename: Promise.method(function () {
                return obj.rename ? obj.rename.apply(null, arguments) : Promise.resolve();
            })
        };
    }
    
    it('should instantiate and initialize', function () {
        var stream = new LogStream(dumy());
        return stream.init();
    });
    it('should find the latest logfile on init and store the value of the next number', function () {
        var stream = new LogStream(dumy({
            files: [ 'log', 'log.1', 'log.2' ]
        }));
        return stream.init().then(function () {
            stream.nextNumber.should.equal(3);
        });
    });
    it('should ignore gaps in the sequence', function () {
        var stream = new LogStream(dumy({
            files: [ 'log', 'log.5' ]
        }));
        return stream.init().then(function () {
            stream.nextNumber.should.equal(6);
        });
    });
    it('should initialize automatically when written to', function (done) {
        var strim = new Stream.PassThrough();
        var stream = new LogStream(dumy({
            stream: strim
        }));
        strim.on('data', function (chunk) {
            chunk.toString().should.equal('foo');
            done();
        });
        
        stream.write('foo');
    });
    it('should output to a new stream when exceeding maxSize', function (done) {
        var strim = new Stream.PassThrough(),
            strim2 = new Stream.PassThrough();
        
        var stream = new LogStream(dumy({
            streams: [ strim, strim2 ]
        }));
        
        strim.on('data', function (chunk) {
            chunk.toString().should.equal('0123456789');
        });
        strim2.on('data', function (chunk) {
            chunk.toString().should.equal('foo');
            done();
        });
        
        stream.write('0123456789');
        stream.write('foo');
    });
    it('should end old stream when diverting to a new one', function (done) {
        var strim = new Stream.PassThrough(),
            strim2 = new Stream.PassThrough();
        
        var stream = new LogStream(dumy({
            streams: [ strim, strim2 ]
        }));
        
        strim.on('finish', function () { done(); });
        
        stream.write('0123456789');
        stream.write('foo');
    });
    it('should initialize to the size of any existing log file', function () {
        var stream = new LogStream(dumy({
            stat: function () { return Promise.resolve({ size: 123 }); }
        }));
        return stream.init().then(function () {
            stream.bytes.should.equal(123);
        });
    });
});
