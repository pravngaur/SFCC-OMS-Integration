'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');

server.get('Start', function (req, res, next) {
    var sourceCodeRedirectURL = session.sourceCodeInfo.redirect; // eslint-disable-line no-undef
    if (sourceCodeRedirectURL) {
        res.redirect(sourceCodeRedirectURL.location);
    } else {
        res.redirect(URLUtils.url('Home-Show'));
    }

    next();
});

module.exports = server.exports();
