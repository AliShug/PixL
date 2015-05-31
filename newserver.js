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
var validator = require('express-validator');

var MongoStore = require('connect-mongo')(session);

var fs = require('fs');
console.log('Running @ '+process.cwd());

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
    saveUninitialized : true,
    store: new MongoStore({
        url:'mongodb://localhost/pixl'
    })
}));


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended:true }));
app.use(multer({dest:'./uploads/'}));
app.use(validator());

var defaultUser = {
    loggedIn:false,
    imgUrl:'/thumbs/profile.png'
};

// Custom user middleware
app.use(function (req, res, next) {
    req.user = defaultUser;

    if (req.session.loggedIn) {
        db.users.findOne({_id:mongojs.ObjectId(req.session.user_id)}, function(err, user) {
            if (user) {
                req.user = user;
                if (!user.imgUrl) req.user.imgUrl = defaultUser.imgUrl;
                req.user.loggedIn = true;
            }
            else {
                req.session.loggedIn = false;
                req.user.loggedIn = false;
            }
            next();
        });
    }
    else {
        req.user.loggedIn = false;
        next();
    }
});

// Custom item fetch middleware
app.use('/item/:itemid*', function (req, res, next) {
    // Check id length
    if (req.params.itemid.length !== 24) {
        res.render('error', {
            title:'Error',
            heading:'Badly formed item ID',
            message:'That item doesn\'t seem to exist'
        });
        return;
    }

    db.items.findOne({_id : mongojs.ObjectId(req.params.itemid.toString())}, function(err, item) {
        if (!item) {
            // Error immediately
            res.render('error', {
                title:'Error',
                heading:'Missing Item',
                message:'That item doesn\'t seem to exist'
            });
        }
        else {
            req.item = item;
            next();
        }
    });
});

// Ajax API
app.get('/api/deleteitem/:itemid', function(req, res) {
    if (!req.user) {
        res.send('You don\'t have permission to do that');
        return;
    }

    try {
        var id = req.params.itemid;
        db.items.findOne({_id:mongojs.ObjectId(id)}, function(err, item) {
            if (!item) {
                res.send('Could not find '+id);
                return;
            }

            // Permissions
            if (!req.user.admin && item.author !== req.user.username) {
                res.send('You don\'t have permission to do that');
            }
            else {
                try {
                    fs.unlinkSync('./public/items/'+item._id+'.json');
                    console.log('Deleted '+item._id+'.json');
                }
                catch (e) {console.log(e);}
                db.items.remove({
                    _id:mongojs.ObjectId(id)
                }, function() {
                    res.send('Success');
                });
            }
        });
    }
    catch (e) {
        res.send(e.message);
    }
});
app.get('/api/featureitem/:itemid', function(req, res) {
    if (!req.user) {
        res.send('You don\'t have permission to do that');
        return;
    }

    try {
        var id = req.params.itemid;
        db.items.findOne({_id:mongojs.ObjectId(id)}, function(err, item) {
            if (!item) {
                res.send('Could not find '+id);
                return;
            }

            // Permissions
            if (!req.user.admin) {
                res.send('You don\'t have permission to do that');
            }
            else {
                // Update featured_id
                db.pages.update({
                    file:'landing'
                }, {$set:{
                    featured_id:item._id
                }}, function() {
                    res.send('Success');
                });
            }
        });
    }
    catch (e) {
        res.send(e.message);
    }
});
app.get('/api/postcomment/:itemid', function(req, res) {
    if (!req.user) {
        res.send('You don\'t have permission to do that');
        return;
    }

    var msg = req.query.msg;
    var author = req.query.author;
    if (!msg || !author) {
        res.send('Message/author required');
    }

    try {
        var id = req.params.itemid;
        db.items.findOne({_id:mongojs.ObjectId(id)}, function(err, item) {
            if (!item) {
                res.send('Could not find '+id);
                return;
            }

            // Add a comment
            db.items.update({
                _id:item._id
            }, {$push:{comments:{
                author:author,
                msg:msg
            }}}, function() {
                res.render('comment', {genComment:true, author:author, msg:msg});
            });
        });
    }
    catch (e) {
        res.send(e.message);
    }
});


// User pages
app.get('/user/:username', function(req, res, next) {
    db.users.findOne({username:req.params.username}, function(err, user) {
        if (user) {
            if (!user.imgUrl) user.imgUrl = defaultUser.imgUrl;
            db.items.find({
                author:user.username
            }, function(err, items) {
                res.render('user', {
                    title:'User '+user.username,
                    user:req.user,
                    renderUser:user,
                    results:items
                });
            });
        }
        else {
            // Fallthrough to 404
            next();
        }
    });
});

// User edit
app.post('/user/:username/edit', function(req, res) {
    if (req.user.loggedIn) {
        req.checkBody('email', 'valid email required').isEmail();
        req.checkBody('password', 'password of length 6-20 characters required').len(6,20);

        if (req.validationErrors()) {
            res.render('user_edit', {
                title:'Edit '+req.user.username,
                user:req.user,
                errors:req.validationErrors(true)
            });
        }
        else {
           db.users.update({_id:mongojs.ObjectId(req.user._id)}, {
               $set : {
                   email:req.body.email,
                   password:req.body.password
               }
           }, function() {
               res.redirect('/user/'+req.user.username);
           });
        }
    }
    else {
        // Show permission error
        res.render('error', {
            title:'Permission Denied',
            user:req.user,
            heading:'Error',
            message:'You can\'t edit accounts other than your own'
        });
    }
});
app.get('/user/:username/edit', function(req, res) {
    if (req.user.loggedIn) {
        res.render('user_edit', {
            title:'Edit '+req.user.username,
            user:req.user
        });
    }
    else {
        // Show permission error
        res.render('error', {
            title:'Permission Denied',
            user:req.user,
            heading:'Error',
            message:'You can\'t edit accounts other than your own'
        });
    }
});

// Signup
app.get('/signup', function(req, res) {
    if (req.user.loggedIn) {
        res.redirect(301, '/');
        return;
    }

    res.render('signup', {title:'PixL - Signup', file:'signup'});
});
app.post('/signup', function(req, res) {
    if (req.user.loggedIn) {
        res.redirect(301, '/');
        return;
    }

    // Check input
    req.checkBody('name', 'Invalid name').notEmpty();
    req.checkBody('username', 'username of length > 3 required').len(3,100);
    req.checkBody('email', 'valid email required').isEmail();
    req.checkBody('password', 'password of length 6-20 characters required').len(6,20);
    
    if (req.validationErrors()) {
        res.render('signup', {
            title:'PixL - Signup',
            file:'signup',
            errors:req.validationErrors(true),
            inputs:{
                name:req.body.name,
                username:req.body.username,
                email:req.body.email
            }
        });
    }
    else {
        // Check against stored usernames
        db.users.findOne({username:req.body.username}, function(err, user) {
            if (!user) {
                // Create the account
                db.users.insert({
                    name:req.body.name,
                    username:req.body.username,
                    email:req.body.email,
                    password:req.body.password,
                    join_date:Date()
                });
                res.render('signup', {title:'Created account!', login_success:true, file:'signup'});
            }
            else {
                // "Already exists" error
                res.render('signup', {
                    title:'PixL - Signup',
                    file:'signup',
                    errors:{
                        username:{
                            msg:'username already exists'
                        }
                    },
                    inputs:{
                        name:req.body.name,
                        username:req.body.username,
                        email:req.body.email
                    }
                });
            }
        });
    }
});

// Login
app.get('/login', function(req, res) {
    if (req.user.loggedIn) {
        res.redirect(301, '/');
        return;
    }

    res.render('login', {title:'PixL - Login', file:'login'});
});
app.post('/login', function(req, res) {
    if (req.user.loggedIn) {
        res.redirect(301, '/');
        return;
    }

    // Check input
    req.checkBody('email', 'must use valid email').isEmail();
    req.checkBody('password', 'no password supplied').notEmpty();

    if (req.validationErrors()) {
        res.render('login', {
            title:'PixL - Login',
            file:'login',
            inputs:{
                email:req.body.email
            },
            errors:req.validationErrors(true)
        });
    }
    else {
        db.users.findOne({
            email:req.body.email,
            password:req.body.password
        }, function(err, user) {
            if (user) {
                req.session.user_id = user._id;
                console.log('Logged in ' + user.username);

                req.session.loggedIn = true;
                res.redirect(301, '/');
            }
            else {
                res.render('login', {
                    title:'PixL - Login',
                    file:'login',
                    inputs:{
                        email:req.body.email
                    },
                    errors:{
                        general:{msg:'invalid email/password combination'}
                    }
                });
            }
        });
    }
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
            pageInfo.user = req.user;
            pageInfo.featured = item;
            res.render(pageInfo.file, pageInfo);
        });
    });
});

// Channels
app.get('/channels', function(req, res) {
    db.pages.findOne({file:'channels'}, function(err, pageInfo) {
        db.channels.find({}, function(err, channels) {
            pageInfo.channels = channels;
            pageInfo.user = req.user;
            res.render(pageInfo.file, pageInfo);
        });
    });
});

// Channel pages
app.get('/channels/:channel', function(req, res, next) {
    db.channels.findOne({name:req.params.channel}, function(err, channel) {
        if (!channel) {
            next();
            return;
        }

        var sort = '';
        var ord = 0;

        var query = req.query;

        if (!query.sort) sort = 'rate';
        else sort = query.sort;

        if (!query.ord) ord = 'desc';
        else ord = query.ord;

        var sortord = 0;
        if (ord === 'asc') sortord = 1;
        else if (ord === 'desc') sortord = -1;

        var sorter = {};
        switch (sort) {
            case 'rate':
                sorter.views = sortord;
                break;
            case 'pop':
                sorter.views = sortord;
                break;
            case 'new':
                sorter._id = sortord;
                break;
        }

        // Find items with 1 or more tags in the channel tags
        db.items.find({
            tags:{$in:channel.tags}
        }).sort(sorter, function(err, items) {
            res.render('channel', {
                url:req.url,
                title:'PixL - '+channel.name,
                user:req.user,
                channel:channel,
                results:items,
                sort:sort,
                ord:ord
            });
        });
    });
});

// Upload
app.get('/upload', function(req, res) {
    res.render('upload', {
        title:'PixL - Upload',
        user:req.user
    });
});
app.post('/upload', function(req, res) {
    if (!req.files.uploadctl || !fs.existsSync('./'+req.files.uploadctl.path)) {
        res.render('upload', {
            title:'PixL - Upload',
            user:req.user,
            error:'must specify a file'
        });
        return;
    }

    var f = req.files.uploadctl;

    if (!req.body.name) {
        res.render('upload', {
            title:'PixL - Upload',
            user:req.user,
            error:'must specify a name'
        });
        fs.unlinkSync(f.path);
        return;
    }

    // Grab the tags and remove trailing/leading whitespace
    var tags = [];
    if (req.body.tags) {
        var _tags = req.body.tags.split(',');
        for (var i = 0; i < _tags.length; i++) {
            var t = _tags[i].trim();
            if (t !== '') {
                tags.push(t);
            }
        }
    }

    if (tags.length > 20) {
        res.render('upload', {
            title:'PixL - Upload',
            user:req.user,
            error:'too many tags'
        });
        fs.unlinkSync(f.path);
        return;
    }

    if (['fbx', 'obj', '3ds', 'dae'].indexOf(f.extension) > -1) {
        // 3D model
        var id = mongojs.ObjectId();
        var finalPath = './public/items/'+id+'.json';
        var localPath = '../items/'+id+'.json';
        //fs.renameSync('./'+f.path, newPath);
        db.items.insert({
            _id:id,
            type:'3d',
            path:localPath,
            name:req.body.name,
            description:req.body.description,
            upload_date:Date(),
            author:req.user.username,
            views:0,
            tags:['3d', f.extension].concat(tags)
        }, function(err,item) {
            res.render('upload', {
                title:'File upload',
                upload_success:true,
                item_id:id,
                item_name:req.body.name,
                user:req.user
            });
            // Move & convert to threeJS format
            var pyOptions = {
                scriptPath:'./py',
                args:['./'+f.path, finalPath, '-nxf']
            };
            pysh.run('convert_to_threejs.py', pyOptions, function(err, results) {
                if (err) {
                    console.log(err);
                    console.log('Deleting item');
                    if (fs.existsSync(finalPath)) {
                        fs.unlinkSync(finalPath);
                    }
                    db.items.remove({_id:id});
                }
                else {
                    console.log('Results: %j', results);
                }

                // Delete the original uploaded file
                //fs.unlinkSync(f.path);
            });
        });

    }
    else {
        // Delete the file
        fs.unlinkSync(f.path);
        // Show an error
        res.render('upload', {
            title:'Upload error',
            user:req.user,
            error:'invalid file extension'
        });
    }
});

// Item deletion
app.get('/item/:itemid/delete', function(req, res, next) {

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

    db.items.find(  {$text : {$search:query.q}},
                    {score:{$meta:"textScore"}}).sort(sorter,
                    function(err, items) {

        var params = {
            url : req.url,
            title : 'Search',
            results : items,
            user : req.user,
            query : query.q,
            sort : sort,
            ord : ord
        };
        
        res.render('search', params);
    });
});

// Item pages
// Passes information on the item to be displayed to the correct template
app.get('/item/:itemid', function(req, res, next) {
    var params = {
        title : req.item.name,
        item : req.item,
        user : req.user
    }

    // Register a view on the item
    db.items.update({_id : req.item._id}, {$inc:{views:1}});

    // Reverse comment order
    params.item.comments.reverse();

    if (req.item.type === '3d') {
        res.render('item_3d', params);
    }
    else if (req.item.type === 'img') {
        res.render('item_img', params);
    }
    else {
        next();
    }
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
        res.render('404', { title:'Not Found', url: req.url, user:req.user });
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

