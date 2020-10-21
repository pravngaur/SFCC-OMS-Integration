'use strict';

/**
 * @module models/order
 */

/**
 * @type {dw.system.Transaction}
 */
const Transaction = require('dw/system/Transaction');

/**
 * Order class
 * @param {dw.order.Order} [order] Order object
 * @constructor
 * @alias module:models/order~Order
 */
function Order(order) {
    if (empty(order)) {
        throw new Error('order object is empty. Order requires an order object to continue.');
    }

    /**
     * @type {string} The object type represented in Service Cloud
     */
    this.type = 'Order';

    /**
     * @type {dw.order.Order}
     */
    this.order = order;

    /**
     * @type {dw.customer.Profile}
     */
    this.profile = {};
    if (!empty(order.getCustomer()) && !empty(order.getCustomer().getProfile())) {
        this.profile = order.getCustomer().getProfile();
    }
}


/**
 * @alias module:models/order~Order#prototype
 */
Order.prototype = {

    /**
     * Builds up a formatted object for JSON.stringify()
     * @returns {Object}
     */
    toJSON: function () {
        var toJSON = {
            order_no: this.order.getOrderNo(),
            order_total: this.order.getTotalGrossPrice().getValue(),
            status: 'Draft',
            scc_sync_status: 'Created'
        };

        /* Billing Address */
        var billingAddress = this.order.getBillingAddress();

        if(billingAddress){
        	toJSON.billing_street = "";

        	if(billingAddress.address1){
        		toJSON.billing_street += billingAddress.address1;
        	}

        	if(billingAddress.address2){
        		toJSON.billing_street += billingAddress.address2;
        	}

        	if(billingAddress.postBox){
        		toJSON.billing_street += billingAddress.postBox;
        	}

        	toJSON.billing_city = billingAddress.city;
        	toJSON.billing_state = billingAddress.stateCode;
        	toJSON.billing_country = billingAddress.countryCode.toString();
        	toJSON.billing_postal_code = billingAddress.postalCode;
        }

        /* Shipments */
        var shipment = this.order.getDefaultShipment();
        var shippingAddress = shipment.getShippingAddress();

        if(shippingAddress){
        	toJSON.shipping_street = "";

        	if(shippingAddress.address1){
        		toJSON.shipping_street += shippingAddress.address1;
        	}

        	if(shippingAddress.address2){
        		toJSON.shipping_street += shippingAddress.address2;
        	}

        	if(billingAddress.postBox){
        		toJSON.shipping_street += shippingAddress.postBox;
        	}

        	toJSON.shipping_city = shippingAddress.city;
        	toJSON.shipping_state = shippingAddress.stateCode;
        	toJSON.shipping_country = shippingAddress.countryCode.toString();
        	toJSON.shipping_postal_code = shippingAddress.postalCode;
        }


        if (this.order.getCustomer().isAuthenticated() && !empty(this.profile)) {
            toJSON.crmcontact_id = this.profile.custom.sscid;
        }

        return toJSON;
    },

    /**
     * Update the {custom.sscSyncStatus} attribute with the given {status}
     *
     * @param {String} status
     */
    updateStatus: function (status) {
        var order = this.order;

        Transaction.wrap(function () {
            order.custom.sscSyncStatus = status;
        });
    },

    /**
     * Update the {custom.sscid} attribute with the given {id}
     */
    updateExternalId: function (id) {
        var order = this.order;

        Transaction.wrap(function () {
            order.custom.sscid = id;
        });
    },

    /**
     * Update the {custom.sscSyncResponseText} attribute with the given {text}
     *
     * @param {String} text
     */
    updateSyncResponseText: function (text) {
        var order = this.order;

        Transaction.wrap(function () {
            var sscSyncResponseText = order.custom.sscSyncResponseText.slice(0);
            sscSyncResponseText.push(text);
            order.custom.sscSyncResponseText = sscSyncResponseText;
        });
    }
};

module.exports = Order;
