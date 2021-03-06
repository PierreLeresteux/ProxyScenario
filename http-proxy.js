var databaseDir = 'database';
var http = require('http'),
    express = require('express'),
    exphbs = require('express3-handlebars'),
    Datastore = require('nedb'),
    fs = require('fs'),
    db = new Datastore({filename: databaseDir});
var server = {},
    statistics = {
        "call": 0,
        "hit-cache": 0,
        "miss-cache": 0,
        "real-call": 0,
        "entries-number": 0,
        "uptime": 0
    };
sockets = [],
    settings = {};
loadSettingsAndStartServer();

//Functions
function checkDatabaseDir() {
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir);
    }
}
function uptime() {
    statistics['uptime'] = statistics['uptime'] + 1;
    setTimeout(uptime, 1000);
}
function loadSettingsAndStartServer() {
    checkDatabaseDir();
    db.loadDatabase(function (err) {
        db.setting = new Datastore(databaseDir + '/setting.db');
        db.setting.loadDatabase();
        db.setting.find({}, function (err, docs) {
            docs.forEach(function (element, index, array) {
                settings[element.key] = element.value;
            });
            startServer();
            startBackoffice();
        });
    });
}
function startBackoffice() {
    /**BACKOFFICE PART**/
    var app = express();
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.compress());
    app.engine('handlebars', exphbs({defaultLayout: 'main'}));
    app.set('view engine', 'handlebars');
    //Routes
    app.get('/stat', function (req, res) {
        res.send(statistics);
    });
    app.get('/setting', function (req, res) {
        db.setting.find({}, function (err, docs) {
            res.send(docs);
        });
    });
    app.put('/setting/:id', function (req, res) {
        var key = req.params.id;
        var body = req.body;
        console.log("Update setting key/old value/new value " + key + "/" + settings[key] + "/" + body.value);
        db.setting.update({key: key}, {$set: {value: body.value}}, { multi: true }, function (err, numReplaced) {
            if (numReplaced > 0) {
                settings[key] = body.value;
                db.setting.persistence.compactDatafile();
                if (key == 'portProxy') {
                    server.close(function () {
                        console.log('Mock API closed!');
                        startServer();
                    });
                    for (var i = 0; i < sockets.length; i++) {
                        sockets[i].destroy();
                    }
                }
                db.setting.findOne({key: key}, function (err, doc) {
                    res.send(doc);
                });
            } else {
                res.status(404).send('Not modified');
            }
        });

    });
    app.get('/entry', function (req, res) {
        db.entry.find({}, function (err, docs) {
            res.send(docs);
        });
    });
    app.delete('/entry', function (req, res) {
        db.entry.remove({}, { multi: true }, function (err, docs) {
            db.entry.persistence.compactDatafile();
            statistics['entries-number'] = 0;
            res.status(204).send('No content');
        });
    });
    app.post('/entry', function (req, res) {
        var body = req.body;
        body['duration'] = 0;
        body['hits'] = 0;
        db.entry.insert(body, function (err, doc) {
            console.log("New entry " + doc._id);
            res.send(doc);
        });
    });

    app.post('/entry/search', function (req, res) {
        var search = req.body.q;
        var regex = new RegExp(search);
        console.log("Search : " + regex);
        db.entry.find({url: { $regex: regex }}, function (err, docs) {
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
            db.entry.persistence.compactDatafile();
            res.status(204).send('No content');
        });

    });
    app.put('/entry/:id', function (req, res) {
        var id = req.params.id;
        var bodyIn = req.body.bodyIn;
        var bodyOut = req.body.bodyOut;
        db.entry.findOne({_id: req.params.id}, function (err, doc) {
            console.log("Update entry " + id);
            var body = doc;
            body.bodyIn = bodyIn;
            body.bodyOut = bodyOut;
            db.entry.update({_id: id}, {$set: body}, function (err, numReplaced) {
                if (numReplaced > 0) {
                    db.entry.persistence.compactDatafile();
                    db.entry.findOne({_id: id}, function (err, doc) {
                        res.send(doc);
                    });
                } else {
                    res.status(404).send('Not modified');
                }
            });
        });


    });
// UI
    app.get('/', function (req, res) {
        db.entry.find({}, function (err, docs) {
            res.render('home', {docs: docs, settings: settings, helpers: {
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
                },
                checkedOnline: function () {
                    return this.settings.online == true ? ' checked=checked ' : '';
                },
                checkedBypass: function () {
                    return this.settings.bypass == true ? ' checked=checked ' : '';
                }
            }
            });
        });

    });
    app.use('/static', express.static('views/static'));
    app.listen(settings['portAdmin']);
    console.log("Admin interface on port " + settings['portAdmin']);
}
function realApiCall(url, method, req, bodyIn, res) {
    if (settings['online']) {
        var startDate = new Date();
        var options = {
            host: settings['baseUrl'],
            port: settings['basePort'],
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
                if (bodyIn == '') {
                    bodyIn = '""';
                }
                if (str == '') {
                    str = '""';
                }
                str = JSON.parse(str);
                bodyIn = JSON.parse(bodyIn);
                var endDate = new Date();
                var entry = {
                    method: method,
                    url: url,
                    bodyOut: str,
                    bodyIn: bodyIn,
                    duration: endDate - startDate,
                    hits: 1
                };
                db.entry.insert(entry);
                statistics['entries-number'] = statistics['entries-number'] + 1;
                console.log("New entry recorded : " + method + ":" + url);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.write(JSON.stringify(str));
                res.end();
            });
        };
        var realReq = http.request(options, callback);
        realReq.write(bodyIn);
        realReq.end();
        statistics['real-call'] = statistics['real-call'] + 1;
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.write('{"error":"Content not yet recorded"}');
        res.end();
    }
}
function startServer() {
    db.entry = new Datastore(databaseDir + '/entry.db');
    db.entry.loadDatabase();
    db.entry.count({}, function (err, count) {
        statistics['entries-number'] = count;
    });
    uptime();
    server = http.createServer(function (req, res) {

        var bodyIn = '';
        req.on('data', function (data) {
            bodyIn += data
        });

        req.on('end', function () {
            statistics['call'] = statistics['call'] + 1;
            var url = req.url;
            var method = req.method;
            if (bodyIn == "") {
                bodyIn = "{}";
            }
            var query = {url: url, method: method, bodyIn: JSON.parse(bodyIn)};

            if (settings['bypass']) {
                realApiCall(url, method, req, bodyIn, res);
            } else {
                db.entry.findOne(query, function (err, doc) {
                    if (null != doc) {
                        statistics['hit-cache'] = statistics['hit-cache'] + 1;
                        console.log("Find entry : " + method + ":" + url);
                        db.entry.update({_id: doc._id}, {$set: {hits: doc.hits + 1}}, function (err, numReplaced) {
                            db.entry.persistence.compactDatafile();
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.write(JSON.stringify(doc.bodyOut));
                            res.end();
                        });

                    } else {
                        statistics['miss-cache'] = statistics['miss-cache'] + 1;
                        realApiCall(url, method, req, bodyIn, res);
                    }
                });
            }
        });
    }).listen(settings['portProxy']);
    console.log("Mock API on port " + settings['portProxy']);
    server.on('connection', function (socket) {
        sockets.push(socket);
        socket.setTimeout(4000);
        socket.on('close', function () {
            sockets.splice(sockets.indexOf(socket), 1);
        });
    });
}
