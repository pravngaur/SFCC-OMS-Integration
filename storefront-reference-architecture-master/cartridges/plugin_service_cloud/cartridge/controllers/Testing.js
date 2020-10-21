'use strict';

var server = require('server');

server.get(
    'Show', function (req, res, next) {
        var testing = "hello";
        var omsOrdersResponse = require('dw/system/HookMgr').callHook('app.order.getStatusFromOMS', 'checkStatusInOMS', customer.getProfile().getEmail());
        res.json({
            success: omsOrdersResponse
        });
        return next();
    }
);

module.exports = server.exports();