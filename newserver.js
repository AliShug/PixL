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

