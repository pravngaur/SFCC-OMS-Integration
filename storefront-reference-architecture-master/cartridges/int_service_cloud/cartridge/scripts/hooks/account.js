'use strict';

/**
 * @module hooks/account
 */

/**
 * @type {dw.system.Logger}
 */
const Logger = require('dw/system/Logger');

/**
 * @type {module:ServiceMgr}
 */
const ServiceMgr = require('../ServiceMgr');
/**
 * @type {dw.system.Logger}
 */
const LOGGER = Logger.getLogger('int_service_cloud', 'hooks.account');

/**
 * Customer account created
 * @param {dw.customer.Customer} customerToExport
 */
function accountCreated(customerToExport) {
    handleExport(customerToExport, 'created');
}

/**
 * Customer account updated
 * @param {dw.customer.Customer} customerToExport
 */
function accountUpdated(customerToExport) {
    handleExport(customerToExport, 'updated');
}

/**
 * This method will export the given {customer} details to Service Cloud through REST API
 * If the async mode is disabled
 *
 * @param {dw.customer.Customer} customerToExport
 * @param {String} status
 */
function handleExport(customerToExport, status) {
    var svc;
    var endpoint;

    // Retrieve the current site and it's operation-mode value
    var Site = require('dw/system/Site').getCurrent();
    var isSyncMode = Site.getCustomPreferenceValue('sscIsAsync');

    // Exit early if we're not running in asynchronous-mode
    if (!isSyncMode) { return; }

    var sccContactModel = new (require('../models/contact'))(customerToExport);

    try {
        if (status === 'created') {
            svc = ServiceMgr.restCreate();
            endpoint = ServiceMgr.restEndpoints.create.account;
        } else {
            svc = ServiceMgr.restUpdate();
            endpoint = ServiceMgr.restEndpoints.update.account;
        }

        // Check if the svc variable is not undefined
        // Cannot use empty() as empty(svc) returns false even if the service is correctly initialized
        if (typeof svc === 'undefined' || empty(endpoint)) {
            return;
        }

        sccContactModel.updateStatus(status);
        var result = svc.call(endpoint, JSON.stringify(sccContactModel));

        if (result.status === 'OK') {
            if (result.object && !result.object.isError && !result.object.isAuthError) {
                sccContactModel.updateStatus('exported');
                sccContactModel.updateExternalId(result.object.responseObj.contactId, result.object.responseObj.accountId);
                sccContactModel.updateSyncResponseText('Successfully Exported');
            } else {
                sccContactModel.updateSyncResponseText(result.object.errorText);
            }
        } else {
            // @TODO log error
            sccContactModel.updateSyncResponseText(result.msg);
        }
    } catch (e) {
        sccContactModel.updateSyncResponseText(e.message);
        LOGGER.error('Error occurred updating customer: {0}', e.message);
        throw e;
    }
}

/**
 * Check Order status in OMS
 * @param {string} emailAddress
 * @returns {Array} omsOrdersResponse -- array of the models carrying response from the OMS
 * @description This method queries the OMS using the Apex REST APIs -- passes the eamil address of the customer & tries to get the orders of this user.
 * Assumes that all the customer orders are tied to this email address only i.e customer resolution is based on Email only -- inline to OMS..
 * 
 */
function checkStatusInOMS(emailAddress) {
    var svc;
    var endpoint;
    var omsOrdersResponse;
    // Retrieve the current site and it's operation-mode value
    var Site = require('dw/system/Site').getCurrent();
    
    try {
        svc = ServiceMgr.restGet();
        endpoint = ServiceMgr.restEndpoints.get.orderStatus;
        
        // Check if the svc variable is not undefined
        // Cannot use empty() as empty(svc) returns false even if the service is correctly initialized
        if (typeof svc === 'undefined' || empty(endpoint)) {
            return;
        }
        
        var result = svc.call(endpoint, emailAddress);

        if (result.status === 'OK') {
            if (result.object && !result.object.isError && !result.object.isAuthError) {
                var ordersArray = result.object.responseObj;
                omsOrdersResponse = new Array();
                ordersArray.forEach(function (orderObj) {
                    var OMSOrderModel = new (require('../models/OMSOrder'))(orderObj);
                    omsOrdersResponse.push(OMSOrderModel);
                });
            }
        } else {
            // @TODO log error & handle per your use case
            
        }
    } catch (e) {
       LOGGER.error('Error occurred while getting the Order Status, details: {0}', e.message);
        throw e;
    }
    return omsOrdersResponse;
}

/**
 * Cancelling the order line items(Order Item Summary) in OMS
 * @param {Object} requestObject -- request body for REST OMS call.
 * @returns {boolean} true -- if cancellation is successful
 * @description This method uses the Apex Rest Api to cancel the order line item.
 * 
 */
function cancelOMSOrder(requestObject) {
    var svc;
    var endpoint;
    // Retrieve the current site and it's operation-mode value
    var Site = require('dw/system/Site').getCurrent();
    
    try {
        svc = ServiceMgr.restUpdate();
        endpoint = ServiceMgr.restEndpoints.update.cancelOrder;
        // Check if the svc variable is not undefined
        // Cannot use empty() as empty(svc) returns false even if the service is correctly initialized
        if (typeof svc === 'undefined' || empty(endpoint)) {
            return;
        }
        var reqObj = JSON.parse(JSON.stringify(requestObject));
        var result = svc.call(endpoint, JSON.stringify(requestObject));
        if (result.status === 'OK') { // line item cancelled successfully
            return true;
        } else {
            // @TODO log error & handle per your use case
            
        }
    } catch (e) {
       LOGGER.error('Error occurred while getting the Order Status, details: {0}', e.message);
        throw e;
    }
    return false;
}

exports.created = accountCreated;
exports.updated = accountUpdated;
exports.checkStatusInOMS = checkStatusInOMS;
exports.cancelOMSOrder = cancelOMSOrder;
