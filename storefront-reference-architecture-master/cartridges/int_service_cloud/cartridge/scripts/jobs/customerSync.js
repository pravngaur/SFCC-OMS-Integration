'use strict';

/**
 * @module jobs/customerSync
 */

/**
 * @type {dw.customer.CustomerMgr}
 */
const CustomerMgr = require('dw/customer/CustomerMgr');

/**
 * @type {dw.system.Site}
 */
const Site = require('dw/system/Site');

/**
 * @type {module:models/contact.Contact}
 */
const ContactModel = require('../models/contact');

/**
 * @type {module:ServiceMgr}
 */
const ServiceMgr = require('../ServiceMgr');

/**
 * @type {dw.util.SeekableIterator}
 */
var profilesIterator;

// Default the order-batch size
var profilesPerRequest = 10;

/**
 * @type {dw.svc.HTTPClient}
 */
var svc;

// Initialize the logger
var Logger = require('dw/system/Logger');

/**
 * @function beforeStep
 * @description This method is used to retrieve the collection of customer profiles to process.
 */
function beforeStep() {

    // Search the profiles for customer-profiles that are tagged as created or updated
    profilesIterator = CustomerMgr.searchProfiles('custom.sscSyncStatus != {0}', 'lastModified asc', 'exported');

    // Create an instance of the Service-Manager
    svc = ServiceMgr.restCreate();

}

/**
 * @function getTotalCount
 * @description This method is used to calculate the total count of customer profiles to process per job-run.
 *
 * @returns {Number} Returns the total number of customer profiles to process for the current job-run.
 */
function getTotalCount() {


    // Initialize local variables
    var foundProfiles;

    // Capture the total number of profiles found
    foundProfiles = profilesIterator.getCount();

    // Was the bulkCallThreshold site preference defined?  If so, use it
    if ('bulkCallThreshold' in Site.current.preferences.custom && Site.current.getCustomPreferenceValue('bulkCallThreshold') != null){
        profilesPerRequest = Site.current.getCustomPreferenceValue('bulkCallThreshold');
    }

    // Use the processing calculation to determine how many orders to process
    return Math.ceil(foundProfiles/profilesPerRequest);

}

/**
 * @param parameters
 * @param stepExecution
 * @returns {void|Array}
 */
function read() {
    if (profilesIterator.hasNext()) {
        var profileArray = new Array();
        for (var i = 0; i < profilesPerRequest && profilesIterator.hasNext(); i++) {
            profileArray.push(profilesIterator.next());
        }
        return profileArray;
    }
}

/**
 * @param {Array} profileArray
 * @returns {Array}
 */
function process(profileArray) {
    return profileArray;
}

function write(lines) {
    var profileArray;
    var result;
    var object;
    var requestObjectParsed;
    var profile;
    var sccContactModel;

    for (var i = 0; i < lines.size(); i++) {
        profileArray = lines.get(i);
        var requestObject = [];
        for (var j = 0; j < profileArray.length; j++) {
            profile = profileArray[j];
            if (profile.custom.sscSyncStatus.value === 'created' || profile.custom.sscSyncStatus.value === 'updated') { // TODO only created is supported currently
                requestObject.push(new ContactModel(null, profile));
            }
        }

        if (requestObject.length > 0) {
            requestObject = JSON.stringify(requestObject);
            result = svc.call(ServiceMgr.restEndpoints.create.batchAccount, requestObject);
            if (result.status === 'OK') { // TODO look at moving this to afterStep possibly?
                if (result.object && !result.object.isError && !result.object.isAuthError) {
                    for (var k = 0; k < result.object.responseObj.length; k++) {
                        var record = result.object.responseObj[k];
                        profile = CustomerMgr.getProfile(record.SFCCCustomerNo);
                        sccContactModel = new ContactModel(null, profile);
                        if (record.errors == null) {
                            sccContactModel.updateStatus('exported');
                            sccContactModel.updateExternalId(record.contactId,record.accountId);
                            sccContactModel.updateSyncResponseText('Successfully Exported');
                        } else {
                            sccContactModel.updateSyncResponseText(record.errors.errorMessage);
                        }
                    }
                } else {
                    requestObjectParsed = JSON.parse(requestObject);
                    for (var l = 0; l < requestObjectParsed.length; l++) {
                        object = requestObjectParsed[l];
                        profile = CustomerMgr.getProfile(object.customer_no);
                        sccContactModel = new ContactModel(null, profile);
                        sccContactModel.updateSyncResponseText(result.object.errorText);
                    }
                }
            } else {
                requestObjectParsed = JSON.parse(requestObject)
                for (var m = 0; m < requestObjectParsed.length; m++) {
                    object = requestObjectParsed[m];
                    profile = CustomerMgr.getProfile(object.customer_no);
                    sccContactModel = new ContactModel(null, profile);
                    sccContactModel.updateSyncResponseText(result.msg);
                }
            }
        }
    }
}

function afterStep() {
    profilesIterator.close();
}

module.exports = {
    beforeStep: beforeStep,
    getTotalCount: getTotalCount,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};
