// Load the web-server, file-system and file-path modules.
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');

// Load the python shell
var pysh = require('python-shell');

// The database 
var mongojs = require('mongojs');
var db = mongojs('pixl', ['pages', 'users', 'channels', 'items']); // Database is hosted locally!

db.on('ready', function() {
    console.log("Database connected successfully");
});

db.on('error',function(err) {
        console.log('Database error', err);
});

// Express
var express = require('express');
var app = express();

var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');

// Config
var ports = [80, 443];
app.set('views', './template');
app.set('case sensitive routing', true);

// Templating with jade
app.set('view engine', 'jade');
app.locals.pretty = true;

// Session data
app.use(session({
    secret : 'nazis on the moon',
    cookie : {},
    saveUninitialized : true
}));

app.use(function(req, res, next) {
    //if (!req.session.loggedIn) req.session.loggedIn = false;
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended:true }));
app.use(multer());

// Signup
app.get('/signup', function(req, res) {
    if (req.session.loggedIn) {
        res.redirect(301, '/');
        return;
    }

    res.render('signup', {title:'PixL - Signup', file:'signup'});
});
app.post('/signup', function(req, res) {
    if (req.session.loggedIn) {
        res.redirect(301, '/');
        return;
    }

    console.log(req.body);
    req.session.loggedIn = true;
    res.render('signup', {title:'Created account!', login_success:true, file:'signup'});
});

// Login
app.get('/login', function(req, res) {
    if (req.session.loggedIn) {
        res.redirect(301, '/');
        return;
    }

    res.render('login', {title:'PixL - Login', file:'login'});
});
app.post('/login', function(req, res) {
    if (req.session.loggedIn) {
        res.redirect(301, '/');
        return;
    }

    console.log(req.body);
    req.session.loggedIn = true;
    res.render('login', {title:'Logged in!', login_success:true, file:'login'});
});

// Logout (just destroy the session)
app.all('/logout', function(req,res) {
    req.session.destroy();
    res.redirect(301, '/');
});

// Landing page
app.get('/', function(req, res) {
    db.pages.findOne({file: 'landing'}, function(err, pageInfo) {
        db.items.findOne({_id:mongojs.ObjectId(pageInfo.featured_id)}, function(err, item) {
            function land(err, user) {
                if (!user) user = {};
                if (!user.name) user.loggedIn = false;
                pageInfo.user = user;
                pageInfo.featured = item;
                res.render(pageInfo.file, pageInfo);
            }

            if (req.session.loggedIn) {
                db.users.findOne({_id:req.session.user_id}, land);
            }
            else {
                land(null, {loggedIn:false});
            }
        });
    });
});

// Channels
app.get('/channels', function(req, res) {
    db.pages.findOne({file:'channels'}, function(err, pageInfo) {
        db.users.findOne({}, function(err, user) {
            db.channels.find({}, function(err, channels) {
                pageInfo.channels = channels;
                pageInfo.user = user;
                res.render(pageInfo.file, pageInfo);
            });
        });
    });
});

// Search
// Performs a database search based on the query (if there is one)
// Uses the generic search.jade template to display a list of results
app.get('/search', function(req, res, next) {
    var query = req.query;

    if (!query.q) {
        //res.render('badsearch', {title:'Search'});
        //return;
        query.q = '';
    }

    var sort = '';
    var ord = 0;

    if (!query.sort) sort = 'rel';
    else sort = query.sort;

    if (!query.ord) ord = 'asc';
    else ord = query.ord;

    var sortord = 0;
    if (ord === 'asc') sortord = 1;
    else if (ord === 'desc') sortord = -1;

    var sorter = {};
    switch (sort) {
        case 'rel':
            sorter.score = {$meta:"textScore"};
            break;
        case 'rate':
            sorter.score = {$meta:"textScore"}; // change!!
            break;
        case 'pop':
            sorter.views = sortord;
            break;
        case 'new':
            sorter._id = sortord;
            break;
    }

    db.users.findOne({}, function(err,user) {
        db.items.find(  {$text : {$search:query.q}},
                        {score:{$meta:"textScore"}}).sort(sorter,
                        function(err, items) {

            var params = {
                url : req.url,
                title : 'Search',
                results : items,
                user : user,
                query : query.q,
                sort : sort,
                ord : ord
            };
            
            console.log(params);
            res.render('search', params);
        });
    });
});

// Item pages
// Passes information on the item to be displayed to the correct template
app.get('/item/:itemid', function(req, res, next) {
    if (req.params.itemid.length !== 24) {
        next();
        return;
    }

    db.users.findOne({}, function(err, user) {
        console.log(req.params.itemid);
        console.log(mongojs.ObjectId(req.params.itemid));
        db.items.findOne({_id : mongojs.ObjectId(req.params.itemid.toString())}, function(err, item) {
            if (!item) {
                console.log("Item " + req.params.itemid + ": unrecognized ID");
                next();
                return;
            }

            var params = {
                title : item.name,
                item : item,
                user : user
            }

            // Register a view on the item
            db.items.update({_id : item._id}, {$inc:{views:1}});

            if (item.type === '3d') {
                res.render('item_3d', params);
            }
            else if (item.type === 'img') {
                res.render('item_img', params);
            }
        });
    });
});

// Testing thing
app.get('/:file.html', function(req, res, next) {
    // Google verification
    if (req.url.indexOf('google') > -1) {
        next(); // pass to static middleware 
        return;
    }

    console.log('Serving ' + req.url);
    console.log('        ' + req.path);
    console.log('        ' + req.params.file);

    res.send('You tried to access ' + req.params.file);
    //res.render('test', {title: 'Hey', message: 'Hello there!'});
});


// Static file serving (from public dir)
app.use(express.static('public'));

// Final fallback - 404
app.use(function(req, res, next) {
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

