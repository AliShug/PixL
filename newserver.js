// Load the web-server, file-system and file-path modules.
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');

// Load the python shell
var pysh = require('python-shell');

// The database 
var db = require('mongojs').connect("mydb", ["test"]);
var ports = [80, 443];

// Express
var express = require('express');
var app = express();

// Config
app.set('views', './template');
app.set('case sensitive routing', true);

// Templating with jade
app.set('view engine', 'jade');
app.locals.pretty = true;

// Serving requests
app.get('/', function(req, res) {
    console.log(req.url);
    res.render('test', {title: 'Hey', message: 'Hello there!'});
});

// (html files are *almost* all dynamically generated)
app.get('/:file.html', function(req, res, next) {
    // Google verification
    if (req.url.indexOf('google') > -1) {
        next();
        return;
    }

    console.log('Serving ' + req.url);
    console.log('        ' + req.path);
    console.log('        ' + req.params.file);
    res.render('test', {title: 'Hey', message: 'Hello there!'});
});

app.get('/test', function(req, res) {
    res.send('Hello world!');
});


// Static file serving (from public dir)
app.use(express.static('public'));

// Start the server
var server = app.listen(ports[0], function() {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Webserver listening at http://%s:%s', host, port);

});

