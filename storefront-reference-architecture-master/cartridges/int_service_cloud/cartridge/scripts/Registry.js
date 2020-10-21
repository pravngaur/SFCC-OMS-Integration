'use strict';

/**
 * Registry.js
 */

/**
 * Cartridge script path
 * @const {string}
 * @private
 */
var path = '/int_service_cloud/cartridge/scripts/';

/**
 * Registry object
 * @type {{authToken: module:int_service_cloud.authToken}}
 * @exports int_service_cloud
 */
var Registry = {
    /**
     * @returns {module:models/authToken~AuthToken} Instance of AuthToken
     */
    authToken: function () {
        /**
         * @type {module:models/authToken~AuthToken}
         */
        var Model = require(path + 'models/authToken');
        return new Model();
    }
};

module.exports = Registry;
