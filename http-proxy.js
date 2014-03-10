var databaseName = 'database';
var http = require('http'),
    httpProxy = require('http-proxy'),
    Datastore = require('nedb'),
    db = new Datastore({ filename: databaseName });

var baseUrl = 'api.openweathermap.org';

db.loadDatabase(function (err) {
    db = {};
    db.entry = new Datastore(databaseName + '/entry.db');
    db.entry.loadDatabase();

    process.argv.forEach(function(val, index, array) {
        if (val=='eraseDB'){
            console.log("Erase DB");
            db.entry.remove({}, {});
        };
    });

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
    console.log("Proxy listen on port 8000");
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
    }).listen(8080);
    console.log("Mock API on port 8080");
});