# Description

Writable stream (v0.10) that performs log rotation. Files are output with the prefix you supply (default 'log') as e.g. `log` (active log), `log.0`, `log.1`, etc.

# Usage

    var LogStream = require('log-stream');
    var outStream = new LogStream({
        fileName: 'log',
        dirName: 'logs',
        maxSize: 0x100000
    });

The above values are the defaults. You may also specify handlers for the filesystem access functions:

    var outStream = new LogStream({
        rename: function (oldfile, newfile) { ... },
        readDir: function (dirName) { ... },
        createWriteStream: function (path) { ... }
    });
    
This is used for the tests mainly, but I may as well document it. `rename` and `readDir` must return promises for their result.
