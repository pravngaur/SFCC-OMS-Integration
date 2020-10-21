'use strict';

/**
 * @module models/OMSOrder
 */


/**
 * OMSOrder class
 * @param {Object} [omsOrder] - order representation returned from OMS
 * @constructor
 * @alias module:models/OMSOrder~OMSOrder
 */
function OMSOrder(omsOrder) {
    /**
     * TODO: If your use case mandates a response back from OMS -- throw an error, otherwise
     * handle it in a way that application/user error is not caused.
    if (empty(omsOrder)) {
        throw new Error('Order representation returned from OMS is empty.');
    } */

    /**
     * @type {string} REST API url which can be used to get the full Order details from OMS.
     */
    this.omsOrderSummaryURL = omsOrder.attributes.url;

    /**
     * @type {string} Record ID of this order in OMS
     */
    this.omsOrderSummaryID = omsOrder.Id;

    /**
     * @type {string} Commerce Cloud Order Number
     */
    this.commerceOrderNumber = omsOrder.OrderNumber;

    /**
     * @type {string} Status in OMS
     */
    this.omsOrderSummaryStatus = omsOrder.Status;
}

module.exports = OMSOrder;
