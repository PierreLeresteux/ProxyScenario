var databaseName = 'database';
var http = require('http'),
    httpProxy = require('http-proxy'),
    send = require('send'),
    fs = require('fs'),
    Datastore = require('nedb'),
    db = new Datastore({ filename: databaseName });

var baseUrl = 'api.openweathermap.org';

db.loadDatabase(function (err) {
    db = {};
    db.entry = new Datastore(databaseName + '/entry.db');
    db.entry.loadDatabase();

    http.createServer(function (req, res) {
        var url = req.url;
        var method = req.method;
        var body = '';
        req.on('data', function (data) {
            body += data
        });

        req.on('end', function () {
            var realReq = http.request(options, callback);
            realReq.write(body);
            realReq.end();
        });

        var options = {
            host: baseUrl,
            path: url,
            method: method,
            headers: req.headers
        };


        callback = function (response) {
            var str = '';

            response.on('data', function (chunk) {
                str += chunk;
            });

            response.on('end', function () {
                var entry = {
                    method: method,
                    url: url,
                    bodyOut: str,
                    bodyIn: body
                };
                db.entry.insert(entry);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.write(str);
                res.end();
            });
        }


    }).listen(8000);

    var app = http.createServer(function (req, res) {

        var bodyIn = '';
        req.on('data', function (data) {
            bodyIn += data
        });

        req.on('end', function () {
            var url = req.url;
            var method = req.method;

            var query = {url: url, method: method, bodyIn:bodyIn};

            db.entry.findOne(query, function (err, doc) {
                if (null != doc) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.write(doc.bodyOut);
                    res.end();
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.write('{"error":"Content not yet recorded","request":'+JSON.stringify(query)+'}');
                    res.end();
                }
            });
        });

        function error(err) {
            res.statusCode = err.status || 500;
            res.end(err.message);
        }

        function redirect() {
            res.statusCode = 301;
            res.setHeader('Location', req.url + '/');
            res.end('Redirecting to ' + req.url + '/');
        }




    }).listen(8080);
});