'use strict';

var server = require('server');

server.extend(module.superModule);

server.append('SaveAddress', function (req, res, next) {
    this.on('route:Complete', function (requ, resp) {
        if(customer.authenticated){
            require('dw/system/HookMgr').callHook('app.account.updated', 'updated', customer);
        }
    });
    next();
});

server.append('DeleteAddress', function (req, res, next) {
    this.on('route:Complete', function (requ, resp) {
        if(customer.authenticated){
            require('dw/system/HookMgr').callHook('app.account.updated', 'updated', customer);
        }
    });
    next();
});

server.append('SetDefault', function (req, res, next) {
    this.on('route:Complete', function (requ, resp) {
        if(customer.authenticated){
            require('dw/system/HookMgr').callHook('app.account.updated', 'updated', customer);
        }
    });
    next();
});

module.exports = server.exports();
