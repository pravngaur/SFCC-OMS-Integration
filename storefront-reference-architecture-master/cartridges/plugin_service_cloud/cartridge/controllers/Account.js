'use strict';

var server = require('server');

server.extend(module.superModule);

server.append('SubmitRegistration', function (req, res, next) {
    this.on('route:Complete', function (requ, resp) {
        if (resp.getViewData().authenticatedCustomer) {
            require('dw/system/HookMgr').callHook('app.account.created', 'created', resp.getViewData().authenticatedCustomer);
        }
    });
    next();
});

server.append('SaveProfile', function (req, res, next) {
    this.on('route:Complete', function (requ, resp) {
		if(customer.authenticated){
			require('dw/system/HookMgr').callHook('app.account.updated', 'updated', customer);
		}
    });
    next();
});

server.append('Show', function (req, res, next) {
    if(customer.authenticated){
        require('dw/system/HookMgr').callHook('app.order.getStatusFromOMS', 'checkStatusInOMS', customer.getProfile().getEmail());
    }
    //update the order in the model
    next();
});

module.exports = server.exports();
