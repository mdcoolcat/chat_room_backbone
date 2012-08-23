var http = require('http');
var url = require('url');
var qs = require('querystring');
var mongo = require('/Users/danmei/Downloads/devlib/node_modules/mongodb/lib/mongodb'),
    Server = mongo.Server,
    Db = mongo.Db;

var db = new Db('testDb', new Server('127.0.0.1', 27017, {auto_reconnect: true, poolSize: 4}));

db.open(function(err, db) {
    if (!err) {
        console.log('connected to db');
    } else {
        console.log('exiting', err);
        process.exit(1);
    }
});

function extractId(pathname) {
    return pathname.slice(pathname.lastIndexOf('/') + 1, pathname.indexOf('?'));
}

function start(route, handle) {
    function onRequest(request, response) {

        console.log('\n');
        var parsedReq = url.parse(request.url);
        var pathname = parsedReq.pathname; 
        console.log('method', request.method);
        console.log('path', pathname);
        console.log(qs.parse(parsedReq.query));
        
        var theUrl = pathname.slice(0, pathname.lastIndexOf('/'));
        switch (request.method) {
            case 'GET':
            route(handle, pathname, response, qs.parse(parsedReq.query), db);
            break;
            case 'PUT':
            console.log('getting user...', pathname.slice(pathname.lastIndexOf('/')+1));
            var data = {
                'id' : extractId(pathname),
                'detail' : qs.parse(parsedReq.query)
            };
            route(handle, theUrl, response, data, db);
            break;
            case 'DELETE':
            route(handle, theUrl + '/delete', response, extractId(pathname), db);
            break;
            case 'OPTIONS':
            route(handle, '/dft', response);
            break;
            default:
            //deal with 'POST/PUT/OPTIONS...'
            var data = '';
            request.setEncoding('utf8');
            request.addListener('data', function(postDataChunk) {
                data += postDataChunk;
                console.log(typeof(postDataChunk));
                console.log('data', postDataChunk);
            });
            request.addListener('end', function() {
                console.log('end', data)
                route(handle, theUrl, response, data, db);
            });
        }
    }

    http.createServer(onRequest).listen(8888);
}

exports.start = start;
