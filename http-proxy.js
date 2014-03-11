var databaseName = 'database';
var http = require('http'),
    httpProxy = require('http-proxy'),
    Datastore = require('nedb'),
    db = new Datastore({ filename: databaseName });

var baseUrl = 'api.openweathermap.org';
var offline = false;
var port = 8080;

db.loadDatabase(function (err) {
    db = {};
    db.entry = new Datastore(databaseName + '/entry.db');
    db.entry.loadDatabase();


    process.argv.forEach(function (val, index, array) {

        if (val == 'eraseDB') {
            console.log("Erase DB");
            db.entry.remove({}, {});
        }
        if (val == 'offline') {
            console.log("Offline mode");
            offline = true;
        }
    });
    var app = http.createServer(function (req, res) {

        var bodyIn = '';
        req.on('data', function (data) {
            bodyIn += data
        });

        req.on('end', function () {
            var url = req.url;
            var method = req.method;
            var query = {url: url, method: method, bodyIn: bodyIn};

            db.entry.findOne(query, function (err, doc) {
                if (null != doc) {
                    console.log("Find entry : "+method+":"+url);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.write(doc.bodyOut);
                    res.end();
                } else {
                    if (!offline) {
                        var startDate=new Date();
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
                                var endDate=new Date();
                                var entry = {
                                    method: method,
                                    url: url,
                                    bodyOut: str,
                                    bodyIn: bodyIn,
                                    duration:endDate-startDate
                                };
                                db.entry.insert(entry);
                                console.log("New entry recorded : "+method+":"+url);
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.write(str);
                                res.end();
                            });
                        };
                        var realReq = http.request(options, callback);
                        realReq.write(bodyIn);
                        realReq.end();

                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.write('{"error":"Content not yet recorded","request":' + JSON.stringify(query) + '}');
                        res.end();
                    }
                }
            });
        });
    }).listen(port);
    console.log("Mock API on port " + port);
});