var jade = require('jade');
var fs = require('fs');

var html = jade.renderFile('template/report.jade', {});
//console.log(html);

var file = fs.openSync('public/report.html', 'w');
fs.writeSync(file, html);
fs.closeSync(file);