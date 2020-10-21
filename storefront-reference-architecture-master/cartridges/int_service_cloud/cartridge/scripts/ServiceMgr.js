'use strict';

/**
 * @module ServiceMgr
 */

/**
 * Service Cloud Services Manager
 */

/**
 * @type {dw.svc.LocalServiceRegistry}
 */
const LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

/**
 * @type {dw.system.Site}
 */
const Site = require('dw/system/Site');

/**
 * @type {String} Current SiteID
 */
const currentSite = Site.current.ID;

/**
 * @type {module:services/auth}
 */
const auth = require('./services/auth');
/**
 * @type {module:services/rest}
 */
const rest = require('./services/rest');

const SERVICES = {
    auth: 'servicecloud.auth',
    rest: 'servicecloud.rest'
};

/**
 * Returns the service related to the given {serviceID} initialized with the given {definition}
 *
 * @param {String} serviceID
 * @param {Object} definition
 *
 * @returns {dw/svc/Service}
 */
function getService(serviceID, definition) {
    return LocalServiceRegistry.createService(serviceID, definition);
}

function buildServiceID(serviceID) {
    return serviceID + '-' + currentSite;
}

module.exports = {
    /**
     * Returns a new instance of the Service Cloud Auth Service
     *
     * @returns {dw/svc/Service}
     */
    auth: function () {
        return getService(buildServiceID(SERVICES.auth), auth);
    },

    restEndpoints: rest.endpoints,

    /**
     * Returns a new instance of the Service Cloud REST Service initialized with the {get} definitions
     *
     * @returns {dw/svc/Service}
     */
    restGet: function () {
        return getService(buildServiceID(SERVICES.rest), rest.definitions.get);
    },

    /**
     * Returns a new instance of the Service Cloud REST Service initialized with the {get} definitions
     *
     * @returns {dw/svc/Service}
     */
    restQuery: function () {
        return getService(buildServiceID(SERVICES.rest), rest.definitions.query);
    },

    /**
     * Returns a new instance of the Service Cloud REST Service initialized with the {create} definitions
     *
     * @returns {dw/svc/Service}
     */
    restCreate: function () {
        return getService(buildServiceID(SERVICES.rest), rest.definitions.create);
    },

    /**
     * Returns a new instance of the Service Cloud REST Service initialized with the {update} definitions
     *
     * @returns {dw/svc/Service}
     */
    restUpdate: function () {
        return getService(buildServiceID(SERVICES.rest), rest.definitions.update);
    }
};
