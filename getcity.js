#!/bin/nodejs

var args = process.argv;
args.shift();
args.shift();

var s = '';
if (args[0] == 'secure') {
    s = 's';
    args.shift();
}

var port = 80;

var http = require('http');
var url = require('url');
var fs = require('fs');

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.startsWith = function(suffix) {
    return this.indexOf(suffix) === 0;
};

const ROOT_DIR = process.cwd() + '/files';

console.log('Starting Server...');

var cityFile = fs.readFileSync("UtahCities.txt");
var UtahCities = []
cityFile.toString().split('\n').forEach(function(item, i, arr) {
    UtahCities.push({'city': item});
});

http.createServer(function (request, response) {

    var urlObj = url.parse(request.url, true, false);
    console.log(urlObj.pathname);
    if(urlObj.pathname === "/getcity") {
        // Execute the REST service
        console.log("In REST Service");
        //console.log(urlObj);
        var prefix = urlObj.query.q.toLowerCase();
        var cities = UtahCities.filter( function(item) {
            return item.city.toLowerCase().startsWith(prefix);
        });
        response.writeHead(200);
        response.end(JSON.stringify(cities));
    } else {
        // Serve static files
        fs.readFile(ROOT_DIR + urlObj.pathname, function (err,data) {
            if (err) {
                response.writeHead(404);
                response.end(JSON.stringify(err));
                return;
            }
            response.writeHead(200);
            response.end(data);
        });
    }
}).listen(port);
