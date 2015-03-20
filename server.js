#!/bin/nodejs

var express = require('express');
var http = require('http');
var https = require('https');
var urllib = require('url');
var fs = require('fs');
var mongo = require('mongodb');
var bodyParser = require('body-parser');
var basicAuth = require('basic-auth-connect');

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.startsWith = function(suffix) {
    return this.indexOf(suffix) === 0;
};

app = express();
var options = {
    host: '127.0.0.1',
    key: fs.readFileSync('ssl/server.key'),
    cert: fs.readFileSync('ssl/server.crt')
};
console.log('Starting Server...');

http.createServer(app).listen(80);
https.createServer(options, app).listen(443);

app.get('/', function (request, response) {
    response.send('Get Index');
});

app.use('/', express.static(process.cwd() + '/files', {})); //maxAge: 60*60*1000}));

var cityFile = fs.readFileSync("UtahCities.txt");
var UtahCities = []
cityFile.toString().split('\n').forEach(function(item, i, arr) {
    UtahCities.push({'city': item});
});

app.get('/getcity', function (request, response) {
    var url = urllib.parse(request.url, true, false);
    var prefix = url.query.q.toLowerCase();
    var cities = UtahCities.filter( function(item) {
        return item.city.toLowerCase().startsWith(prefix);
    });
    response.writeHead(200);
    response.end(JSON.stringify(cities) + '\n');
});

function handle_error(response, error, code, prefix) {
    if (typeof(code)==='undefined')   code = 500;
    if (typeof(prefix)==='undefined') prefix = "Error";
    console.log(error);
    response.writeHead(code);
    response.end(prefix + ':\n' + error.toString() + '\n');
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var auth = basicAuth(function(user, pass) {
    return((user ==='cs360')&&(pass === 'test'));
});

app.get('/comments', function (request, response) {
    var MongoClient = mongo.MongoClient;
    MongoClient.connect("mongodb://localhost/weather", function(err, db) {
        if(err) handle_error(response, err);
        db.collection("comments", function(err, comments){
            if(err) handle_error(response, err);
            else {
                comments.find(function(err, items){
                    items.toArray(function(i, comments){
                        //console.log("Document Array: ");
                        //console.log(comments);
                        response.writeHead(200);
                        response.end(JSON.stringify(comments) + '\n');
                    });
                });
            }
        });
    });
});

app.post('/comments', auth, function (request, response) {
    try {
        console.log(request.body);
        //var comment = JSON.parse(request.body);
        comment = request.body;
        console.log(comment);
        console.log("Name: "+comment.Name);
        console.log("Comment: "+comment.Comment);

        // Now put it into the database
        var MongoClient = mongo.MongoClient;
        MongoClient.connect("mongodb://localhost/weather", function(err, db) {
            if(err) handle_error(response, err, 500);
            else {
                db.collection('comments').insert(comment, function(err, records) {
                    console.log("Record added as "+records[0]._id);
                });
                response.writeHead(200);
                response.end("Posted successfully!\n" +
                "You posted: \"" + comment.toString() + '"');
            }
        });
    }
    catch (e) {
        handle_error(response, e, 500, "Invalid JSON");
    }
});

