'use strict';

var server = require('server');

server.get('Start', function (req, res, next) {
    res.render('/reporting/reporting');
    next();
});

server.get('MiniCart', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentOrNewBasket();
    var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
    var reportingURLs;
    if (currentBasket && currentBasket.allLineItems.length) {
        reportingURLs = reportingUrlsHelper.getBasketOpenReportingURLs(currentBasket);
    }

    res.render('/reporting/reportingUrls', {
        reportingURLs: reportingURLs
    });
    next();
});

module.exports = server.exports();
