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

app.set('views', './template');

// Static file serving (from public dir)
app.use(express.static('public'));

// Templating through jade
app.set('view engine', 'jade');

app.get('/', function(req, res) {
    res.send('Hello world!');
});

app.get('/test', function(req, res) {
    res.render('test', {title: 'Hey', message: 'Hello there!'});
});

var server = app.listen(80, function() {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);

});

