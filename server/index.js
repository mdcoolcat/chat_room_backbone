var server = require('./server');
var router = require('./router');
var requestHandler = require('./requestHandler');

var handle = {};
handle['/'] = requestHandler.index;
handle['/index'] = requestHandler.index;
handle['/users'] = requestHandler.getUsers;
handle['/model'] = requestHandler.editUser;
handle['/model/delete'] = requestHandler.deleteUser;
handle['/dft'] = requestHandler.dft;

server.start(router.route, handle);
