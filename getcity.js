#!/bin/nodejs

var args = process.argv;
args.shift();
args.shift();

var port;

var s = '';
if (args[0] === 'secure') {
    s = 's';
    args.shift();
    port = 443;
}
else port = 80;

if (args[0] != undefined) {
    port = parseInt(args[0]);
}

var http = require('http');
var urllib = require('url');
var fs = require('fs');
var mongo = require('mongodb');

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

    var url = urllib.parse(request.url, true, false);
    console.log(url.pathname);

    function handle_error(error, code, prefix) {
        if (typeof(code)==='undefined')   code = 500;
        if (typeof(prefix)==='undefined') prefix = "Error";
        console.log(error);
        response.writeHead(code);
        response.end(prefix + ':\n' + error.toString() + '\n');
    }

    function respond(message) {
        response.writeHead(200);
        response.end(message + '\n');
    }

    if (request.method === "GET") {
        console.log("GET on " + url.pathname);
        if(url.pathname === "/getcity") {
            // Execute the REST service
            console.log("In REST Service");
            //console.log(url);
            var prefix = url.query.q.toLowerCase();
            var cities = UtahCities.filter( function(item) {
                return item.city.toLowerCase().startsWith(prefix);
            });
            respond(JSON.stringify(cities));
        }
        if (url.pathname === '/comments') {
            var MongoClient = mongo.MongoClient;
            MongoClient.connect("mongodb://localhost/weather", function(err, db) {
            if(err) throw err;
                db.collection("comments", function(err, comments){
                    if(err) throw err;
                    else {
                        comments.find(function(err, items){
                            items.toArray(function(err, comments){
                                console.log("Document Array: ");
                                console.log(comments);
                                respond(JSON.stringify(comments));
                            });
                        });
                    }
                });
            });
        }
        else {
            fs.readFile(ROOT_DIR + url.pathname, function (err,data) {
                if (err) handle_error(JSON.stringify(err), 404, "File Not Found");
                else respond(data);
            });
        }
    }

    else if (request.method === "POST") {
        console.log("POST on " + url.pathname);
        // console.log(request);
        // First read the form data
        var postData = "";
        request.on('data', function (chunk) {
            postData += chunk;
        });
        request.on('end', function () {
            console.log('Posted Data:');
            console.log(postData);
            if (url.pathname === '/comments') {
                try {
                    var reqObj = JSON.parse(postData);
                    //console.log(reqObj);
                    console.log("Name: "+reqObj.Name);
                    console.log("Comment: "+reqObj.Comment);

                    // Now put it into the database
                    var MongoClient = mongo.MongoClient;
                    MongoClient.connect("mongodb://localhost/weather", function(err, db) {
                        if(err) handle_error(err, 500);
                        else {
                            db.collection('comments').insert(reqObj,function(err, records) {
                                console.log("Record added as "+records[0]._id);
                            });
                            respond("Posted successfully!\n" +
                            "You posted: \"" + postData + '"');
                        }
                    });
                }
                catch (e) {
                    handle_error(e, 500, "Invalid JSON");
                }
            }
            else {
                response.writeHead(404);
                response.end("POST is not valid for the given URL.");
            }
        });
    }
}).listen(port);
