'use strict';

/**
 * @module jobs/orderSync
 */

/**
 * @type {dw.order.OrderMgr}
 */
const OrderMgr = require('dw/order/OrderMgr');

/**
 * @type {dw.system.Site}
 */
const Site = require('dw/system/Site');

/**
 * @type {module:models/contact.Order}
 */
const OrderModel = require('../models/order');

/**
 * @type {module:ServiceMgr}
 */
const ServiceMgr = require('../ServiceMgr');

/**
 * @type {dw.util.SeekableIterator}
 */
var orderIterator;

// Default the order-batch size
var ordersPerRequest=10;

/**
 * @type {dw.svc.HTTPClient}
 */
var svc;

// Initialize the logger
var Logger = require('dw/system/Logger');

/**
 * @function beforeStep
 * @description This method is used to retrieve the collection of orders to process.
 */
function beforeStep() {

    // Search the orders for orders that aren't exported
    orderIterator = OrderMgr.searchOrders('custom.sscSyncStatus != {0}', 'lastModified asc', 'exported');

    // Create an instance of the Service-Manager
    svc = ServiceMgr.restCreate();

}

/**
 * @function getTotalCount
 * @description This method is used to calculate the total count of orders to process per job-run.
 *
 * @returns {Number} Returns the total number of orders to process for the current job-run.
 */
function getTotalCount() {

    // Initialize local variables
    var foundOrders;

    // Capture the total number of orders found
    foundOrders = orderIterator.getCount();

    // Was the bulkCallThreshold site preference defined?  If so, use it
    if ('bulkCallThreshold' in Site.current.preferences.custom && Site.current.getCustomPreferenceValue('bulkCallThreshold') != null){
        ordersPerRequest = Site.current.getCustomPreferenceValue('bulkCallThreshold');
    }

    // Use the processing calculation to determine how many orders to process
    return Math.ceil(foundOrders/ordersPerRequest);

}

function read() {
    if (orderIterator.hasNext()) {
        var orderArray = new Array();
        for (var i = 0; i < ordersPerRequest && orderIterator.hasNext(); i++) {
            orderArray.push(orderIterator.next());
        }
        return orderArray;
    }
}

/**
 * @param {dw.order.Order} order
 * @param parameters
 * @param stepExecution
 * @returns {void|dw.order.Order}
 */
function process(orderArray) {
    return orderArray;
}

function write(lines) {
    var sscSyncResponseText;
    var orderArray;
    var result;
    var order;
    var object;
    var sccOrderModel;

    for (var i = 0; i < lines.size(); i++) {
        orderArray = lines.get(i);
        var requestObject=[];

        for (var j = 0; j < orderArray.length; j++){
            order = orderArray[j];
            if (order.custom.sscSyncStatus.value === 'created' || order.custom.sscSyncStatus.value === 'updated') {
                requestObject.push(new OrderModel(order));
            }
        }

        if (requestObject.length>0){
            requestObject = JSON.stringify(requestObject);
			      result = svc.call(ServiceMgr.restEndpoints.create.batchOrder, requestObject);

            if (result.status === 'OK') { // TODO look at moving this to afterStep possibly?
                if (result.object && !result.object.isError && !result.object.isAuthError) {
                    for (var k = 0; k < result.object.responseObj.length; k++){
                        var record = result.object.responseObj[k];
                        order = OrderMgr.getOrder(record.SFCCOrderNo);
                        sccOrderModel = new OrderModel(order);
                        if (record.errors==null) {
                            sccOrderModel.updateStatus('exported');
                            sccOrderModel.updateExternalId(record.recordId);
                            sccOrderModel.updateSyncResponseText('Successfully Exported');
                        } else {
                            sccOrderModel.updateSyncResponseText(record.errors.errorMessage);
                        }
                    }
                } else {
                    var requestParsed = JSON.parse(requestObject);
                    for (var l = 0; l < requestParsed.length; l++) {
                        object = requestParsed[l];
                        order = OrderMgr.getOrder(object.order_no);
                        sccOrderModel = new OrderModel(order);
                        sccOrderModel.updateSyncResponseText(result.object.errorText);
                    }
                }
            }  else {
                var requestObjectParsed = JSON.parse(requestObject);
                for (var m = 0; m < requestObjectParsed.length; m++) {
                    object = requestObjectParsed[m];
                    order = OrderMgr.getOrder(object.order_no);
                    sccOrderModel = new OrderModel(order);
                    sccOrderModel.updateSyncResponseText(result.msg);
                }
            }
        }
    }
}

function afterStep() {
    orderIterator.close();
}

module.exports = {
    beforeStep: beforeStep,
    getTotalCount: getTotalCount,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};
