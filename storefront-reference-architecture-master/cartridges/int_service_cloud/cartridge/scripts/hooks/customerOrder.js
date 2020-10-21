'use strict';

/**
 * @module hooks/customerOrder
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
const LOGGER = Logger.getLogger('int_service_cloud', 'hooks.customerOrder');

/**
 * Customer order created
 * @param {dw.order.Order} order
 */
function orderCreated(order) {
    handleExport(order, 'created');
}

/**
 * Customer order updated
 * @param {dw.order.Order} order
 */
function orderUpdated(order) {
    handleExport(order, 'updated');
}

/**
 * This method will export the given {order} details to Service Cloud through REST API
 * If the async mode is disabled
 *
 * @param {dw.order.Order} order
 * @param {String} status
 */
function handleExport(order, status) {
    var svc;
    var endpoint;

    // Retrieve the current site and it's operation-mode value
    var Site = require('dw/system/Site').getCurrent();
    var isSyncMode = Site.getCustomPreferenceValue('sscIsAsync');

    // Exit early if we're not running in asynchronous-mode
    if (!isSyncMode) { return; }

    var sccOrderModel = new (require('../models/order'))(order);

    try {
        if (status === 'created') {
            svc = ServiceMgr.restCreate();
            endpoint = ServiceMgr.restEndpoints.create.order;
        } else {
            svc = ServiceMgr.restUpdate();
            endpoint = ServiceMgr.restEndpoints.update.order;
        }

        // Check if the svc variable is not undefined
        // Cannot use empty() as empty(svc) returns false even if the service is correctly initialized
        if (typeof svc === 'undefined' || empty(endpoint)) {
            return;
        }

        sccOrderModel.updateStatus(status);
        var result = svc.call(ServiceMgr.restEndpoints.create.order, JSON.stringify(sccOrderModel));

        if (result.status === 'OK') {
            if (result.object && !result.object.isError && !result.object.isAuthError) {
                sccOrderModel.updateStatus('exported');
                sccOrderModel.updateExternalId(result.object.responseObj.recordId);
                sccOrderModel.updateSyncResponseText('Successfully Exported');
            } else {
                sccOrderModel.updateSyncResponseText(result.object.errorText);
            }
        } else {
            sccOrderModel.updateSyncResponseText(result.msg);
        }
    } catch (e) {
        sccOrderModel.updateSyncResponseText(e.message);
        LOGGER.error('Error occurred updating order: {0}', e.message);
        throw e;
    }
}

exports.created = orderCreated;
exports.updated = orderUpdated;
