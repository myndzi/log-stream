'use strict';

var Promise = require('bluebird'),
    stream = require('stream'),
    PATH = require('path'),
    util = require('util'),
    fs = require('fs');

module.exports = LogStream;

function LogStream(cfg) {
    cfg = cfg || { };
    
    stream.Writable.call(this);
    
    this.stat = cfg.stat || Promise.promisify(fs.stat);
    this.rename = cfg.rename || Promise.promisify(fs.rename);
    this.readDir = cfg.readDir || Promise.promisify(fs.readdir);
    this.createWriteStream = cfg.createWriteStream || fs.createWriteStream;
    
    this.fileName = cfg.name || 'log';
    this.dirName = cfg.dir || 'logs';
    this.nextNumber = 0;
    this.maxSize = cfg.maxSize || 0x100;//000; // 1,048,576
    
    this.bytes = 0;
    this.stream = null;
}
util.inherits(LogStream, stream.Writable);

LogStream.prototype._write = function (chunk, encoding, callback) {
    var self = this;
    
    return Promise.try(function () {
        if (self.stream === null) {
            return self.init();
        }
    }).then(function () {
        self.bytes += chunk.length;
        self.stream.write(chunk);
    }).then(function () {
        if (self.bytes >= self.maxSize) {
            return self.rotateStream();
        }
    }).nodeify(callback);
};
LogStream.prototype.init = Promise.method(function () {
    var self = this, regex = new RegExp('^'+self.fileName);
    
    // find largest already-existing file
    return self.readDir(self.dirName).filter(function (item) {
        return regex.test(item);
    }).reduce(function (max, item) {
        var num = +item.split('.').pop();
        
        if (typeof num === 'number' && num > max) {
            return num;
        } else {
            return max;
        }
    }, 0).then(function (max) {
        if (typeof max !== 'number') { max = 0; }
        self.nextNumber = max + 1;
        return self.openStream();
    });
});
LogStream.prototype.openStream = Promise.method(function () {
    var self = this;
    if (this.stream) {
        console.log('WARN: LogStream.openStream called but already had a stream');
        this.stream.end();
    }
    
    var logfile = PATH.join(this.dirName, this.fileName);
    return self.stat(logfile).then(function (stats) {
        self.bytes = stats.size;
    }).catch(function (err) {
        if (err.cause && err.cause.code === 'ENOENT') {
            self.bytes = 0;
        } else {
            throw err;
        }
    }).then(function () {
        self.stream = self.createWriteStream(logfile, { flags: 'a' });
    });
});
LogStream.prototype.rotateStream = Promise.method(function () {
    var logfile = PATH.join(this.dirName, this.fileName),
        archive = PATH.join(this.dirName, this.fileName + '.' + this.nextNumber);
    
    this.nextNumber++;
    
    this.stream.end();
    this.stream = null;
    
    return this.rename(logfile, archive).then(this.openStream.bind(this));
});
