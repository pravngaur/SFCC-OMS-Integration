'use strict';

/**
 * @module hooks/case
 */

/**
 * @type {dw.system.Logger}
 */
const Logger = require('dw/system/Logger');
/**
 * @type {dw.util.StringUtils}
 */
const StringUtils = require('dw/util/StringUtils');

/**
 * @type {module:ServiceMgr}
 */
const ServiceMgr = require('../ServiceMgr');
/**
 * @type {dw.system.Logger}
 */
const LOGGER = Logger.getLogger('int_service_cloud', 'hooks.case');

/**
 * Customer case created
 *
 * @param caseObj
 */
function caseCreated(caseObj) {
    handleExport(caseObj);
}

/**
 * Customer case updated
 *
 * @param caseObj
 */
function caseUpdated(caseObj) {
    handleExport(caseObj);
}

/**
 * Get customer case by Salesforce service cloud case id
 *
 * @param scccaseId - Salesforce service cloud case id
 */
function getCase(scccaseId) {
    try {
        var svc = ServiceMgr.restGet();
        return svc.call(StringUtils.format(ServiceMgr.restEndpoints.get.case, scccaseId));
    } catch (e) {
        LOGGER.error('Error occurred while getting the case {0}: {1}', scccaseId, e.message);
        throw e;
    }
}

/**
 * Get all customer cases by Salesforce service cloud contact id
 *
 * @param scccaseId - Salesforce service cloud contact id
 */
function getAllCases(scccontactid) {
    try {
        var svc = ServiceMgr.restGet();
        return svc.call(StringUtils.format(ServiceMgr.restEndpoints.get.case, scccontactid));
    } catch (e) {
        LOGGER.error('Error occurred while getting all cases for the contact id {0}: {1}', scccontactid, e.message);
        throw e;
    }
}

/**
 * Export the given {caseObj} to Service Cloud and returns the service response
 *
 * @param {Object} caseObj
 *
 * @returns {Object}
 */
function handleExport(caseObj) {
    try {
        var sccCaseModel = new (require('../models/case'))(caseObj);
        var svc = ServiceMgr.restCreate();
        return svc.call(ServiceMgr.restEndpoints.create.case, JSON.stringify(sccCaseModel));
    } catch (e) {
        LOGGER.error('Error occurred while creating case: {0}', e.message);
        throw e;
    }
}

exports.created = caseCreated;
exports.updated = caseUpdated;
exports.get = getCase;
exports.getAll = getAllCases;
