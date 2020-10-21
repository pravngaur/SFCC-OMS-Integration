'use strict';

/**
 * Description of the Controller and the logic it provides
 *
 * @module controllers/Case
 */

/* Script Modules */
var app = require('*/cartridge/scripts/app');
var guard = require('*/cartridge/scripts/guard');

function list() {
    app.getView().render('case/caselist');
}

function show() {
    app.getView().render('case/casedetails');
}

/* Web exposed methods */

/** Renders the case listing page.
 * @see {@link module:controllers/Case~list} */
exports.List = guard.ensure(['get', 'https', 'loggedIn'], list);
/** Renders the case overview.
 * @see {@link module:controllers/Case~show} */
exports.Show = guard.ensure(['get', 'https', 'loggedIn'], show);
