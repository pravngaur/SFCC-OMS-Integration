'use strict';

/**
 * @module models/authToken
 */

/**
 * @type {dw.system.Site}
 */
const Site = require('dw/system/Site');
/**
 * @type {dw.system.Transaction}
 */
const Transaction = require('dw/system/Transaction');

/**
 * Custom object name
 * @const {string}
 * @private
 */
const customObjectName = 'ServiceCloudAuthToken';

/**
 * @type {module:util/helpers}
 */
const helpers = require('../util/helpers');
/**
 * @type {module:ServiceMgr}
 */
const ServiceMgr = require('../ServiceMgr');

// The limit is 10 minutes (10 * 60 seconds)
// This is used to refresh the token only if the token is expired or will expire in the next 10 minutes
const EXPIRE_LIMIT = 10 * 60;

/**
 * Retrieves cached token from custom object storage
 * If no existing token object, an empty one is created
 * @returns {dw.object.CustomAttributes} Returns token custom attributes
 */
function getObject() {
    return helpers.getCustomObject(customObjectName, Site.getCurrent().getID());
}

/**
 * Puts token into custom object storage
 * @param {Object} obj A plain JS object with the token
 * @returns {Object} Returns the same plain JS object
 */
function updateCachedTokenObject(obj) {
    var custObj = getObject();

    Transaction.wrap(function () {
        custObj.token = JSON.stringify(obj);
    });

    return obj;
}

/**
 * Returns whether the stored token is valid
 *
 * @returns {boolean} Whether the stored token is valid and not expired
 * @alias module:models/authToken~AuthToken#isValidAuth
 */
function isValidAuth() {
    if (!this.token || !this.token.access_token) { // If we didn't load any token yet, load it from cache (Custom object)
        var cachedToken = getObject();
        if (!cachedToken || !cachedToken.token) {
            return false;
        }
        cachedToken = helpers.expandJSON(cachedToken.token, {});

        if (!cachedToken.expires || Date.now() >= (cachedToken.expires - EXPIRE_LIMIT)) {
            return false;
        } else {
            this.token = cachedToken;
        }

        if (!this.token) {
            return false;
        }
    } else if (Date.now() >= (this.token.expires - EXPIRE_LIMIT)) {
        return false;
    }

    return this.token && this.token.access_token;
}

/**
 * Gets a valid token from storage or from a new auth request
 *
 * @returns {boolean|Object} False or plain JS object containing the token response
 * @alias module:models/authToken~AuthToken#getValidToken
 */
function getValidToken() {
    if (!this.isValidAuth()) {
        var svc = ServiceMgr.auth();
        var result = svc.call();
        if (result.status === 'OK' && result.object) {
            this.token = updateCachedTokenObject(result.object);
        }
    }

    return this.isValidAuth() && this.token;
}

/**
 * Token class for checking auth and retrieving valid token
 * @constructor
 * @alias module:models/authToken~AuthToken
 */
function AuthToken() {
    /**
     * Token object returned by Service Cloud
     * @type {Object}
     * @property {string} id Identity URL used to identify user and query for information
     * @property {string} access_token The token auth string
     * @property {string} instance_url The Salesforce instance that API calls should be sent to
     * @property {number} issued_at Unix Timestamp (seconds)
     * @property {string} signature Base64-encoded HMAC-SHA256 signature
     * @property {number} issued Date issued in milliseconds
     * @property {number} expires Date expires in milliseconds
     */
    this.token = null;
}

/**
 * @alias module:models/authToken~AuthToken#prototype
 */
AuthToken.prototype = {
    isValidAuth: function isValid() {
        return isValidAuth.apply(this);
    },

    getValidToken: function getValid() {
        return getValidToken.apply(this);
    }
};

module.exports = AuthToken;
