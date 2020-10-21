'use strict';

var server = require('server');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

server.extend(module.superModule);

server.append('Confirm', function (req, res, next) {
    var OrderMgr = require('dw/order/OrderMgr');
    var order = OrderMgr.getOrder(req.querystring.ID);
    require('dw/system/HookMgr').callHook('app.order.created', 'created', order);

    next();
});

server.append('CreateAccount', function (req, res, next) {
    this.on('route:Complete', function (requ, resp) {
        if(customer.authenticated){
            require('dw/system/HookMgr').callHook('app.account.created', 'created', customer);
        }
    });
    next();
});

/**
 * Overriding the History Route in order to stuff the Order status from OMS in viewData.
 * TODO: 
 * - This implementation sends the Order status to ISML as returned from OMS, ideally you need to map
 * the OMS statuses to the custom customer facing statuses -- show the some highlevel statuses to customers, not OMS statuses.
 * - As of now, cancel link is available for all the Orders, irrespective of it's status in OMS. Ideally you should limit the cancellation
 * link to the statuses which allow customers to cancel a line item/order.
 */
server.append('History', function (req, res, next) {
    var omsOrdersResponse;
    var responseObject = {};
    // Calling the hook which abstracts the OMS call
    omsOrdersResponse = require('dw/system/HookMgr').callHook('app.order.getStatusFromOMS', 'checkStatusInOMS', customer.getProfile().getEmail());
    if (omsOrdersResponse && !omsOrdersResponse.isEmpty()) {
        var ordersItr = omsOrdersResponse.iterator();
        while (ordersItr.hasNext()) {
            var object = {};
            var orderObj = ordersItr.next();
            object.omsOrderSummaryURL = orderObj.omsOrderSummaryURL;
            object.omsOrderSummaryID = orderObj.omsOrderSummaryID;
            object.commerceOrderNumber = orderObj.commerceOrderNumber;
            object.omsOrderSummaryStatus = orderObj.omsOrderSummaryStatus;
            responseObject[orderObj.commerceOrderNumber] = object;
        }
    }
    res.setViewData({ omsOrders: responseObject });
    next();
});

/**
 * Adding the Cancel Route to facilitate Order cancellation in OMS using the Connect APIs.
 * TODO: 
 * - As of now, cancel link is available for all the Orders, irrespective of it's status in OMS. Ideally you should limit the cancellation
 * link to the statuses which allow customers to cancel a line item/order.
 * - For this demo implementation, for cancellations I am assuming the first item in the Order to be cancelled. But this needs to be handled in the
 * UI -- giving customers the opportunity to select the line item & the quantity for cancellations.
 * 
 */
server.get('Cancel', server.middleware.https,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent, function (req, resp, next) {
        var OrderMgr = require('dw/order/OrderMgr');
        var orderNumber = req.querystring.orderNumber;
        var orderSummaryID = req.querystring.orderSummaryID;
        var orderObj = OrderMgr.getOrder(orderNumber);
        var quantity;
        var productCode;
        if (orderObj) {
            var lineItems = orderObj.getProductLineItems();
            var itr = lineItems.iterator();
            while (itr.hasNext()) {
                var lineItem = itr.next();
                productCode = lineItem.productID;
                quantity = lineItem.quantityValue;
            }
        }
        var requestObject = {
            'quantity': quantity,
            'productCode': productCode,
            'orderSummaryID': orderSummaryID,
            'commerceOrderNumber': orderNumber
        };
        //calling the hook to cancel the order in OMS
        var cancelResponse = require('dw/system/HookMgr').callHook('app.order.cancelOMSOrder', 'cancelOMSOrder', requestObject);
        
        // TODO: for now, i am redirecting to Account landing, but you need to handle it explicitly based on the requirements..
        var URLUtils = require('dw/web/URLUtils');
        resp.redirect(URLUtils.url('Order-History'));
        next();
    });

module.exports = server.exports();
