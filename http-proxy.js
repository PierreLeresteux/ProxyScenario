var databaseName = 'database';
var http = require('http'),
    httpProxy = require('http-proxy'),
    express = require('express'),
    exphbs = require('express3-handlebars'),
    Datastore = require('nedb'),
    db = new Datastore({ filename: databaseName });

var baseUrl = 'dev-unstable.mgt-api.int.masternaut.com';
var offline = false;
var port = 8888;


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
    http.createServer(function (req, res) {

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
                    console.log("Find entry : " + method + ":" + url);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.write(doc.bodyOut);
                    res.end();
                } else {
                    if (!offline) {
                        var startDate = new Date();
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
                                var endDate = new Date();
                                var entry = {
                                    method: method,
                                    url: url,
                                    bodyOut: str,
                                    bodyIn: bodyIn,
                                    duration: endDate - startDate
                                };
                                db.entry.insert(entry);
                                console.log("New entry recorded : " + method + ":" + url);
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

    /**BACKOFFICE PART**/
    var app = express();
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.compress());
    app.engine('handlebars', exphbs({defaultLayout: 'main'}));
    app.set('view engine', 'handlebars');
//    app.enable('view cache');
    //Routes
    app.get('/entry', function (req, res) {
        db.entry.find({}, function (err, docs) {
            res.send(docs);
        });

    });
    app.get('/entry/:id', function (req, res) {
        db.entry.findOne({_id: req.params.id}, function (err, doc) {
            res.send(doc);
        });

    });
    app.delete('/entry/:id', function (req, res) {
        db.entry.remove({_id: req.params.id}, function (err, doc) {
            res.status(204).send('No content');
        });

    });
    app.put('/entry/:id', function (req, res) {
        var id = req.params.id;
        var body = req.body;
        console.log("Update entry " + id + " => " + JSON.stringify(body));
        db.entry.update({_id: id}, {$set: body}, function (err, numReplaced) {
            if (numReplaced > 0) {
                db.entry.findOne({_id: id}, function (err, doc) {
                    res.send(doc);
                });
            } else {
                res.status(404).send('Not modified');
            }
        });

    });
    // UI
    app.get('/', function (req, res) {
        db.entry.find({}, function (err, docs) {
            res.render('home', {docs: docs, helpers: {
                getLabelColor: function () {
                    if ("GET" == this.method) {
                        return "info";
                    }
                    if ("DELETE" == this.method) {
                        return "error";
                    }
                    if ("POST" == this.method) {
                        return "success";
                    }
                    if ("PUT" == this.method) {
                        return "warning";
                    }
                    return "info";
                }}
            });
        });

    });
    app.use('/static', express.static('views/static'));
    app.listen(3000);
});
