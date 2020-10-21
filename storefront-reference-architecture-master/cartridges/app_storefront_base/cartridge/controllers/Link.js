'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');

server.get('Page', function (req, res, next) {
    var redirectUrl = URLUtils.url('Page-Show').toString() + '?' + req.querystring.toString();
    res.redirect(redirectUrl);
    next();
});

server.get('Category', function (req, res, next) {
    var redirectUrl = URLUtils.url('Search-Show').toString() + '?' + req.querystring.toString();
    res.redirect(redirectUrl);
    next();
});

server.get('Product', function (req, res, next) {
    var redirectUrl = URLUtils.url('Product-Show').toString() + '?' + req.querystring.toString();
    res.redirect(redirectUrl);
    next();
});

server.get('CategoryProduct', function (req, res, next) {
    var redirectUrl = URLUtils.url('Product-Show').toString() + '?' + req.querystring.toString();
    res.redirect(redirectUrl);
    next();
});

module.exports = server.exports();
