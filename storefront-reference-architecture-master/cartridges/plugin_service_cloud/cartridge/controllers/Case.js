'use strict';

var server = require('server');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

const formHelper = {
    renderTextInput: function (field) {
        require('dw/template/ISML').renderTemplate('form/textinput', {
            field: field
        });
        return '';
    },
    renderSelectInput: function (field) {
        require('dw/template/ISML').renderTemplate('form/selectinput', {
            field: field
        });
        return '';
    },
    renderTextarea: function (field, attributes) {
        field.attributes += ' ' + Object.keys(attributes).map(function (key) {
            return key + '="' + attributes[key] + '"';
        }).join(' ');
        require('dw/template/ISML').renderTemplate('form/textarea', {
            field: field
        });
        return '';
    }
};

server.get(
    'List',
    server.middleware.https,
    csrfProtection.generateToken,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        var Resource = require('dw/web/Resource');
        var URLUtils = require('dw/web/URLUtils');

        const ServiceMgr = require('*/cartridge/scripts/ServiceMgr');
        var svc = ServiceMgr.restGet();

        var result = svc.call(ServiceMgr.restEndpoints.get.case, customer.profile.custom.sscid);
        var cases = [];

        if (result.status === 'OK') {
            if (result.object && !result.object.isError && !result.object.isAuthError) {
                cases = result.object.responseObj.records;
            } else {
                // error
            }
        } else {
            // error
        }

        res.render('case/caselist', {
            // profileForm: profileForm,
            cases: cases,
            newCase: URLUtils.https('Case-Create'),
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                },
                {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                }
            ]
        });
        next();
    }
);

/**
 * @TODO
 */
server.get(
    'Show',
    server.middleware.https,
    csrfProtection.generateToken,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        res.render('case/casedetails', {
            formHelper: formHelper
        });
        next();
    }
);

server.get(
    'Create',
    server.middleware.https,
    csrfProtection.generateToken,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        var contactusform = server.forms.getForm('contactus');
        contactusform.clear();
        if (customer.authenticated) {
            contactusform.firstname.value = customer.profile.firstName;
            contactusform.lastname.value = customer.profile.lastName;
            contactusform.email.value = customer.profile.email;
        }
        res.render('case/contactus', {
            formHelper: formHelper,
            form: contactusform
        });
        next();
    }
);

server.post(
    'SaveCase',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    csrfProtection.validateRequest,
    function (req, res, next) {
        var URLUtils = require('dw/web/URLUtils');
        var contactusform = server.forms.getForm('contactus');

        if (contactusform.valid) {
            /**
             * @type {dw.system.HookMgr}
             */
            const HookMgr = require('dw/system/HookMgr');
            var hookID = 'app.case.created';
            // call hook if defined, otherwise send out email
            if (HookMgr.hasHook(hookID)) {
                var result = HookMgr.callHook(
                    hookID,
                    hookID.slice(hookID.lastIndexOf('.') + 1),
                    contactusform
                );
                if (!result || result.status !== 'OK') {
                    contactusform.base.invalidateFormElement('Case creation failed, please try again later.');
                    res.redirect(URLUtils.https('Case-Create'));
                }
            } else {
                var Mail = require('dw/net/Mail');
                // var Resource = require('dw/web/Resource');

                var email = new Mail();
                email.addTo(require('dw/system/Site').current.getCustomPreferenceValue('customerServiceEmail')
                || 'no-reply@salesforce.com');
                email.setSubject(contactusform.myquestion.value);
                email.setFrom(contactusform.email.value);

                email.setContent(contactusform.comment.value, 'text/html', 'UTF-8');
                email.send();
            }

            res.render('case/contactus', {
                ConfirmationMessage: 'edit'
            });
        } else {
            res.redirect(URLUtils.https('Case-Create'));
        }

        next();
    }
);

module.exports = server.exports();
