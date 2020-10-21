'use strict';

/**
 * Model to manage customer caseObj information. Creates a CaseModel class that with helper methods
 * to get and create caseObj, create and edit caseObj.
 * @module models/CaseModel
 */

/*
TODO: WIP - this may all change drastically
*/

var AbstractModel = require('*/cartridge/scripts/models/AbstractModel');

/**
 * Case helper providing enhanced content functionality
 * @class module:models/CaseModel~CaseModel
 *
 * @param {dw.customer.Customer} parameter - The customer object to enhance/wrap. ??????
 */
var CaseModel = AbstractModel.extend({
    init: function (type, firstname, lastname, email, phone, ordernumber, subtype, description, scccontactid) {
        this.type = type;
        this.subtype = subtype;
        this.firstname = firstname;
        this.lastname = lastname;
        this.email = email;
        this.phone = phone;
        this.ordernumber = ordernumber;
        this.description = description;
        this.scccontactid = scccontactid;
    }
});

/**
 * Gets the case model for current customer.
 *
 * @alias module:models/CaseModel~CaseModel/get
 * @param {dw.customer.Customer} parameter - The customer object to enhance or wrap. If NULL the current customer is
 * retrieved from the session.
 * @returns {module:models/CaseModel~CaseModel}
 */
CaseModel.get = function (parameter) {
    var obj = null;
    if (!parameter) {
        obj = customer;
    } else if (typeof parameter === 'object') {
        obj = parameter;
    }
    return new CaseModel(obj);
};

/**
 * Get all cases by salesforce contact id from customer object.
 * @alias module:models/CaseModel~CaseModel/getCases
 *
 * @param {String} contactId - Salesforce contact id.
 *
 * @returns {dw.util.ArrayList} - Return list of cases belonging to provided salesforce contact id from Salesforce service cloud.
 */
CaseModel.getCases = function (contactId) {
    return !empty(contactId); // TODO: Implement this method
};

/**
 * Get case details from service cloud by case id
 * @alias module:models/CaseModel~CaseModel/getCaseDetails
 *
 * @returns {caseObj} - Return case object based on provided case id from salesforce service cloud.
 */
CaseModel.getCaseDetails = function (caseId) {
    return !empty(caseId); // TODO: Implement this method
};

/**
 * Update case in service cloud by case id.
 * @alias module:models/CaseModel~CaseModel/updateCase
 *
 * @param {caseObj} caseObj - updated case object
 *
 * @returns {boolean} - return boolean based on case is updated successfully or not.
 */
CaseModel.updateCase = function () {
    // TODO: Implement this method
};

/**
 * Update case in service cloud by case id.
 * @alias module:models/CaseModel~CaseModel/updateCase
 * @param {caseObj} caseObj - updated case object
 * @returns {boolean} - return boolean based on case is updated successfully or not.
 */
CaseModel.submit = function () {
    /**
     * @type {dw.system.HookMgr}
     */
    const HookMgr = require('dw/system/HookMgr');
    var hookID = 'app.case.created';
    if (HookMgr.hasHook(hookID)) {
        HookMgr.callHook(
            hookID,
            hookID.slice(hookID.lastIndexOf('.') + 1)
        );
    } else {
        require('dw/system/Logger').debug('no hook registered for {0}', hookID);
    }
};

/** The case class */
module.exports = CaseModel;
