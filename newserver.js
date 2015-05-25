// Load the web-server, file-system and file-path modules.
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');

// Load the python shell
var pysh = require('python-shell');

// The database 
var mongojs = require('mongojs');
var db = mongojs('pixl', ['pages', 'users']); // Database is hosted locally!

db.on('ready', function() {
    console.log("Database connected successfully");
});

db.on('error',function(err) {
        console.log('Database error', err);
});

// Express
var express = require('express');
var app = express();

// Config
var ports = [80, 443];
app.set('views', './template');
app.set('case sensitive routing', true);

// Templating with jade
app.set('view engine', 'jade');
app.locals.pretty = true;

// Serving requests

// Landing page
app.get('/', function(req, res) {
    db.pages.findOne({file:'landing'}, function(err, pageInfo) {
        db.users.findOne({}, function(err, user) {
            pageInfo.user = user;
            res.render('landing', pageInfo);
        });
    });
});

// Testing thing
app.get('/:file.html', function(req, res, next) {
    // Google verification
    if (req.url.indexOf('google') > -1) {
        next();
        return;
    }

    console.log('Serving ' + req.url);
    console.log('        ' + req.path);
    console.log('        ' + req.params.file);

    res.send('You tried to access ' + req.params.file);
    //res.render('test', {title: 'Hey', message: 'Hello there!'});
});

app.get('/test', function(req, res) {
    res.send('Hello world!');
});


// Static file serving (from public dir)
app.use(express.static('public'));

// Final fallback
app.use(function(req, res, next){
    res.status(404);

    // respond with html page
    if (req.accepts('html')) {
        res.render('404', { url: req.url });
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.send({ error: 'Not found' });
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
});

// Start the server
var server = app.listen(ports[0], function() {

    var host = server.address().address;
    var port = server.address().port;

    console.log('Webserver listening at http://%s:%s', host, port);

});

