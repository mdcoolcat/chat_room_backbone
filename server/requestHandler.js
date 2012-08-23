var exec = require('child_process').exec;
var mongo = require('/Users/danmei/Downloads/devlib/node_modules/mongodb/lib/mongodb'),
    Server = mongo.Server,
    Db = mongo.Db;

function index(response, data) {
    console.log('index handler');

    exec('find /', function (error, stdout, stderr) {
        response.writeHead(200, 
            {'Content-Type': 'text/plain'});
        response.write(stdout);
        response.end();
    });
}

function dft(response, data) {
    console.log('default handler...e', data);
    response.writeHead(200, {
        'Access-Control-Allow-Origin'   : '*', 
        'Access-Control-Allow-Methods'  : 'GET, POST, PUT, DELETE, TRACE, OPTIONS',
        'Access-Control-Allow-Headers'  : 'Content-Type'
    });
    response.end();
}

function postUser(response, data, db) {
    db.collection('user', function(err, collection) {
        if (!err) {
            console.log('in post data', data);
            u = {_id    : data['id'],
                'name'  : data['name'] || data['detail']['name'],
                'color' : data['color'] || data['id'].slice(-3)
            };
            console.log('postUser', u);
            collection.save(u, {safe:true}, function(err, r) {
                if (err) {
                    console.log('err in save');
                    response.writeHead(500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
                    response.write('error on database insert');
                } else {
                    console.log('succeed in save');
                    response.writeHead(200, {
                        'Access-Control-Allow-Origin'   : '*', 
                        'Access-Control-Allow-Methods'  : 'POST, PUT, OPTIONS',
                        'Access-Control-Allow-Headers'  : 'Content-Type'
                    });
                }
                response.end();
            }); 
        } else {
            console.log('open collection err');
            response.writeHead(500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
            response.write('error on database open');
            response.end();
        }   //open collection
    });
}

function getUsers(response, data, db) {
    db.collection('user', function(err, collection) {
        console.log('getUser', data);
        if (!err) {
            if (data['id']) { //find one
                collection.findOne({_id : parseInt(data['id'])}, function(err, results) {
                    if (err) {
                        response.writeHead(500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
                        response.write('error on database query');
                    } else if (!results) {
                        response.writeHead(404, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
                        response.write('Not found');
                    } else {
                        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                        response.write(JSON.stringify(results));
                    }
                    response.end();
                }); //find one
            } else {    //find all
                collection.find().sort({'name': 1}).toArray(function(err, results) {
                    if (err) {
                        response.writeHead(500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
                        response.write('error on database query');
                    } else {
                        console.log('find', results.length);
                        response.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
                        //return an array of json
                        response.write('[');
                        results.forEach(function(u) {
                            response.write(JSON.stringify(u)+',');
                        });
                    }
                    response.end();
                });
            }
        } else {
            console.log('open collection err');
        }   //open collection
    });
}

function deleteUser(response, data, db) {
    db.collection('user', function(err, collection) {
        if (!err) {
            console.log('deleteUser', data);
            collection.remove({_id : data}, function(err, r) {
                if (err) {
                    console.log('err in delete');
                    response.writeHead(500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
                    response.write('error on database remove');
                } else {
                    console.log('succeed in delete');
                    response.writeHead(200, {
                        'Access-Control-Allow-Origin'   : '*', 
                        'Access-Control-Allow-Methods'  : 'DELETE, OPTIONS',
                        'Access-Control-Allow-Headers'  : 'Content-Type'
                    });
                }
                response.end();
            }); 
        } else {
            console.log('open collection err');
            response.writeHead(500, {'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*'});
            response.write('error on database open');
            response.end();
        }   //open collection
    });
}

exports.index = index;
exports.getUsers = getUsers;
exports.editUser = postUser;
exports.deleteUser = deleteUser;
exports.dft = dft;
