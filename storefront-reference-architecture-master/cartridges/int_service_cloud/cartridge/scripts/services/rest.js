'use strict';

/**
 * @module services/rest
 */

/**
 * Service Cloud REST service definition
 */

/**
 * @type {dw.util.StringUtils}
 */
const StringUtils = require('dw/util/StringUtils');

/**
 * @type {module:util/helpers}
 */
const helpers = require('../util/helpers');

const fields = {
    case: ['subject', 'status', 'caseNumber']
};

const endpoints = {
    get: {
        account: '',
        case: 'services/apexrest/Case/{0}',
        order: '',
        orderStatus: 'services/apexrest/OrderManagement',
    },
    create: {
        account: 'services/apexrest/Contact/Registration',
        batchAccount: 'services/apexrest/Contact/Registration/Batch',
        case: 'services/apexrest/Case',
        order: 'services/apexrest/Order/Placement',
        batchOrder: 'services/apexrest/Order/Placement/Batch'
    },
    update: {
        account: 'services/apexrest/Contact/Registration',
        batchAccount: 'services/apexrest/Contact/Registration/Batch',
        case: 'services/apexrest/Case',
        order: 'services/apexrest/Order/Placement',
        batchOrder: 'services/apexrest/Order/Placement/Batch',
        cancelOrder: 'services/apexrest/OrderManagement'
    }
};

/**
 * Inserts auth token into request header
 *
 * @param {dw.svc.HTTPService} svc
 * @param {String} endpoint
 *
 * @throws {Error} Throws error when no valid auth token is available (i.e.- service error, service down)
 */
function setAuthHeader(svc, endpoint) {
    /**
     * @type {module:models/authToken~AuthToken}
     */
    var authToken = require('int_service_cloud').authToken();
    var token = authToken.getValidToken();
    if (empty(token) || !token.access_token) {
        throw new Error('No auth token available!');
    }

    svc.setAuthentication('NONE');
    svc.addHeader('Authorization', 'Bearer ' + token.access_token);
    svc.setURL(StringUtils.format('{0}/{1}', token.instance_url, endpoint));
}

/**
 * Check if 401 due to expired token
 *
 * @param {dw.net.HTTPClient} client
 *
 * @returns {boolean} true if expired auth token
 */
function isValid401(client) {
    var is401 = (client.statusCode === 401);
    var isFailureFromBadToken = false;
    var authResHeader = client.getResponseHeader('WWW-Authenticate');

    if (is401 && authResHeader) {
        isFailureFromBadToken = /^Bearer\s.+?invalid_token/.test(authResHeader);
    }

    return isFailureFromBadToken;
}

/**
 * Check if response type is JSON
 *
 * @param {dw.net.HTTPClient} client
 *
 * @returns {boolean}
 */
function isResponseJSON(client) {
    var contentTypeHeader = client.getResponseHeader('Content-Type');
    return contentTypeHeader && contentTypeHeader.split(';')[0].toLowerCase() === 'application/json';
}

/**
 * Parses response JSON and wraps with an object containing additional helper properties
 *
 * @param {dw.svc.HTTPService} svc
 * @param {dw.net.HTTPClient} client
 *
 * @returns {{responseObj: Object, isError: boolean, isAuthError: boolean, isValidJSON: boolean, errorText: string}}
 */
function parseResponse(svc, client) {
    var isJSON = isResponseJSON(client);
    var parsedBody = client.text;

    if (isJSON) {
        parsedBody = helpers.expandJSON(client.text, {});
    }

    return {
        isValidJSON: isJSON,
        isError: client.statusCode >= 400,
        isAuthError: isValid401(client),
        responseObj: parsedBody,
        errorText: client.errorText
    };
}

var createAndUpdateDefinition = {
    /**
     * Create an object
     *
     * @param {dw.svc.HTTPService} svc
     * @param {String} endpoint
     * @param {Object} modelObject A model instance to be sent to Service Cloud
     *
     * @returns {string} Request body
     */
    createRequest: function (svc, endpoint, modelObject) {
        setAuthHeader(svc, endpoint);
        svc.addHeader('Content-Type', 'application/json');
        return modelObject;
    },
    parseResponse: parseResponse,
    mockCall: function () {
        var obj = {
        };
        return {
            statusCode: 202,
            statusMessage: 'Accepted',
            text: JSON.stringify(obj)
        };
    }
};

var queryDefinition = {
    /**
     * Query records
     *
     * @param {dw.svc.HTTPService} svc
     * @param {String} endpoint
     * @param {string} query A query to be sent to Service Cloud
     *
     * @todo Support query builder: https://github.com/jsforce/jsforce/blob/master/lib/soql-builder.js
     */
    createRequest: function (svc, endpoint, query) {
        query = encodeURIComponent(query).replace(/%20/g, '+');
        setAuthHeader(svc, endpoint);
        svc.setURL(StringUtils.format('{0}query/?q={1}', svc.getURL(), query));
        svc.addHeader('Content-Type', 'application/json');
        svc.setRequestMethod('GET');
    },
    parseResponse: parseResponse,
    mockCall: function () {
        var obj = {
        };
        return {
            statusCode: 200,
            statusMessage: 'Success',
            text: JSON.stringify(obj)
        };
    }
};

var getDefinition = {
    /**
     * Get record(s)
     *
     * @param {dw.svc.HTTPService} svc
     * @param {String} endpoint
     */
    createRequest: function (svc, endpoint, id) {
        setAuthHeader(svc, endpoint);
        svc.setURL(StringUtils.format('{0}/{1}', svc.getURL(), id));
        svc.addHeader('Content-Type', 'application/json');
        svc.setRequestMethod('GET');
    },
    parseResponse: parseResponse,
    mockCall: function () {
        var obj = {
        };
        return {
            statusCode: 200,
            statusMessage: 'Success',
            text: JSON.stringify(obj)
        };
    }
};

module.exports = {
    endpoints: endpoints,
    definitions: {
        create: createAndUpdateDefinition,
        update: createAndUpdateDefinition,
        query: queryDefinition,
        get: getDefinition
    }
};
