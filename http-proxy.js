var http = require('http'),
    sys = require('sys'),
    httpProxy = require('http-proxy'),
    send = require('send'),
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    url = require('url');

var baseUrl='api.openweathermap.org';
var rootPath='/Users/pierre/git/ProxyScenario/root';

http.createServer(function (req, res) {
    var url = req.url;
    var method = req.method;
    sys.puts('Call : '+method+' => '+baseUrl+url);

    var options = {
        host: baseUrl,
        path: url,
        method: method,
        headers: req.headers
    };


    callback = function(response) {
        var str = '';

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function () {
            console.log(str);
            console.log(rootPath+url);
            var split = url.split('/');
            var dirPath=rootPath;
            for (var i=0;i<split.length-1;i++){
                dirPath+=split[i]+"/";
            }
            var fileName = split[split.length-1];
            console.log("DirPath : "+dirPath);
            console.log("Filename : "+fileName);
            mkdirp.sync(dirPath);
            fs.writeFileSync(dirPath+"/"+fileName, str);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.write(str);
            res.end();
        });
    }

    http.request(options, callback).end();

}).listen(8000);

sys.puts('Server running at http://127.0.0.1:8000');

var app = http.createServer(function(req, res){
    function error(err) {
        res.statusCode = err.status || 500;
        res.end(err.message);
    }

    function redirect() {
        res.statusCode = 301;
        res.setHeader('Location', req.url + '/');
        res.end('Redirecting to ' + req.url + '/');
    }

    send(req, req.url)
        .root(rootPath)
        .on('error', error)
        .on('directory', redirect)
        .pipe(res);
}).listen(8080);