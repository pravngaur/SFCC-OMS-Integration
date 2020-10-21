'use strict';

/**
 * @module util/helpers
 */

/**
 * Checks if submitted value type is an Object (and not an Array)
 * @param {*} obj Object to be checked
 * @returns {boolean}
 * @static
 */
function isObject(obj) {
    return typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * Uppercases first char of string
 * @param {string} str String to uppercase
 * @returns {string}
 * @static
 */
function ucfirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Expands JSON
 * @param {string} jsonString
 * @param {*} defaultValue
 *
 * @returns {*} Returns null if empty string or exception encountered
 */
function expandJSON(jsonString, defaultValue) {
    var output;
    try {
        output = jsonString ? JSON.parse(jsonString) : defaultValue;
    } catch (e) {
        // Catch exception from invalid JSON
        require('dw/system/Logger').error('Error parsing JSON: {0}', e);
        output = defaultValue;
    }
    return output;
}

/**
 * Fetches object definition from Custom Object, creating it if not exists
 * @param {string} customObjectName
 * @param {string} objectID
 * @returns {dw.object.CustomAttributes}
 */
function getCustomObject(customObjectName, objectID) {
    var com = require('dw/object/CustomObjectMgr'),
        objectDefinition = com.getCustomObject(customObjectName, objectID);
    if (empty(objectDefinition)) {
        require('dw/system/Transaction').wrap(function () {
            objectDefinition = com.createCustomObject(customObjectName, objectID);
        });
    }
    return objectDefinition.getCustom();
}

exports.isObject = isObject;
exports.ucfirst = ucfirst;
exports.expandJSON = expandJSON;
exports.getCustomObject = getCustomObject;
