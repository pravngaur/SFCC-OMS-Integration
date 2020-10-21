'use strict';

/**
 * @module models/case
 */

/**
 * Case class
 * @param caseObj object
 * @constructor
 * @alias module:models/caseObj~Case
 */
function Case(caseObj) {
    if (empty(caseObj)) {
        throw new Error('Submitted form object is empty.');
    }

    /**
     * @type {string} The object type represented in Service Cloud
     */
    this.type = 'Case';

    // use 'base' for SFRA, if it does not exist fall back to 'object' for SiteGenesis
    this.data = caseObj.base || caseObj.object;
    /**
     * @type {dw.customer.Customer}
     */
    this.customer = caseObj.customer || customer;
    /**
     * @type {dw.customer.Profile}
     */
    this.profile = !empty(this.customer.profile) ? this.customer.profile : {};
}

/**
 * @alias module:models/case~Case#prototype
 */
Case.prototype = {
    /**
     * Builds up a formatted object for JSON.stringify()
     * @returns {Object}
     */
    toJSON: function () {
        var toJSON = {
            first_name: this.data.firstname.value,
            last_name: this.data.lastname.value,
            email: this.data.email.value,
            phone: this.data.phone.value,
            case_type: 'ContactUs',
            order_no: this.data.ordernumber.value,
            case_sub_type: this.data.myquestion.value,
            subject: this.data.myquestion.value,
            description: this.data.comment.value
        };

        if (this.customer.authenticated && !empty(this.profile)) {
            toJSON.contact_id = this.profile.custom.sscid;
            toJSON.customer_id = this.profile.getCustomer().getID();
        }
        
      //Get Order details
        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(this.data.ordernumber.value);
        
        if(order){
        	//get Order attributes
            if(order.custom.sscid){
            	toJSON.sfcc_order_id = order.custom.sscid;
            }
        }

        return toJSON;
    }
};

module.exports = Case;
