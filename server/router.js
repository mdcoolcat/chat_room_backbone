function route(handle, pathname, response, data, db) {
    if (typeof handle[pathname] === 'function')
        handle[pathname](response, data, db);
    else {
        console.log('no handler for ' + pathname);
        response.writeHead(404, 
                { 'Content-Type' : 'text/plain'
        });
        response.write('404 not found');
        response.end();
    }
}

exports.route = route;
