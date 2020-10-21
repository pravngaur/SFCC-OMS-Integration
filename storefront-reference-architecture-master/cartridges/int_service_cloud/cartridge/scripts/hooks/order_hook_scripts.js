/**
 * ©2013-2017 salesforce.com, inc. All rights reserved.
 * 
 * order_hook_scripts.js
 * 
 * Handles OCAPI hooks for order calls
 */
var Logger = require('dw/system/Logger');
const LOGGER = Logger.getLogger('int_service_cloud', 'hooks.customerOrder');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var ProdMgr = require('dw/catalog/ProductMgr');
/**
 * the beforePATCH hook - called before patch order
 */

/* eslint-disable camelcase */

exports.beforePATCH = function(order, orderInput) {
    var method = orderInput.c_method;
    if (method === 'create_return_case') {
        Transaction.begin();
        try {
            let data = orderInput.c_data;
            for (let i = 0; i < data.return_cases.length; i++) {
                let rc = data.return_cases[i];
                var isRma = true;
                if (rc.is_rma=='false'){
                    isRma = false;
                }
                let returnCase = order.createReturnCase(isRma);
                for (let j = 0; j < rc.returncase_items.length; j++) {
                    var ri = rc.returncase_items[j];
                    var product_id = ri.product_id;
                    var authorized_quantity = ri.authorized_quantity;
                    if (!order.getProductLineItems(product_id).empty){
                        var pli = order.getProductLineItems(product_id)[0];
                    } else {
                        throw new Error(dw.util.StringUtils.format('Error Occured in create_return_case. Product ID : {0}. Message : Product not present in order.',product_id));
                    }
                    if (pli.custom.returnAvailableQuantity == null) {
                        pli.custom.returnAvailableQuantity = pli.quantityValue;
                    }
                    if (pli.custom.returnAvailableQuantity >= authorized_quantity) {
                        pli.custom.returnAvailableQuantity = Number(pli.custom.returnAvailableQuantity) - Number(authorized_quantity);
                    } else {
                        throw new Error(dw.util.StringUtils.format('Error Occured in create_return_case. Product ID : {0}. Message : Authorized quantity more than quantity available for return.', product_id));
                    }
                    let orderitem_id = ri.orderitem_id;
                    let reason_code = ri.reason_code;
                    let note = ri.note;
                    let returnCaseItem = returnCase.createItem(orderitem_id);
                    let unit = order.getProductLineItems().iterator().next().quantity.unit;
                    returnCaseItem.setAuthorizedQuantity(new dw.value.Quantity(authorized_quantity, unit));
                    returnCaseItem.setReasonCode(reason_code);
                    returnCaseItem.setNote(note);
                    returnCaseItem.setStatus('CONFIRMED');
                }
            }
        } catch (e) {
            Transaction.rollback();
            return new Status(Status.ERROR, 'createReturnCaseError', e.message);
        }
        Transaction.commit();
    }

    if (method === 'complete_return_case') {
        var data = orderInput.c_data;
        var OrderPickModel = require('*/cartridge/scripts/models/OrderPickModel');
        Transaction.begin();
        try {
            for (let i = 0; i < data.return_cases.length; i++) {
                var rc = data.return_cases[i];
                var returnCase = order.getReturnCase(rc.returncase_number);
                if (returnCase==null){
                    throw new Error(dw.util.StringUtils.format('Return Case with ID {0} not present in order.',rc.returncase_number));
                }
                if (['RETURNED','CANCELLED'].indexOf(returnCase.status.displayValue) > -1){
                    throw new Error(dw.util.StringUtils.format('Return Case with ID {0} already returned/cancelled',rc.returncase_number));
                }
                var _return;
                if (returnCase.getReturns().empty) {
                    _return = returnCase.createReturn();
                } else {
                    _return = returnCase.getReturns().iterator().next();
                }
                for (let j = 0; j < rc.returncase_items.length; j++) {
                    var rci = rc.returncase_items[j];
                    var reason_code = rci.reason_code;
                    var note = rci.note;
                    var returned_quantity = rci.returned_quantity;
                    var returncaseitem_id = rci.returncaseitem_id;
                    var returncaseitem_status = rci.returncaseitem_status;
                    var unit = order.getProductLineItems().iterator().next().quantity.unit;

                    var returnCaseItem = order.getReturnCaseItem(returncaseitem_id);
                    if (returnCaseItem==null){
                        throw new Error(dw.util.StringUtils.format('Return Case Item with ID {0} not present in order.',returncaseitem_id));
                    }
                    if (returncaseitem_status == 'CANCELLED') {
                        //marking the line item available for other returns
                        var lineItem = returnCaseItem.getLineItem();
                        if (['NEW', 'CONFIRMED'].indexOf(returnCaseItem.status.displayValue) > -1) {
                            lineItem.custom.returnAvailableQuantity = Number(lineItem.custom.returnAvailableQuantity) + Number(returnCaseItem.getAuthorizedQuantity());
                            returnCaseItem.setStatus(returncaseitem_status);
                            continue;
                        } else {
                            throw new Error(dw.util.StringUtils.format('Product ID : {0}. Message : Return case not in NEW/CONFIRMED status so can not be cancelled.', lineItem.productID));
                        }

                    }

                    returnCaseItem.setReasonCode(reason_code);
                    returnCaseItem.setNote(note);

                    var returnItem;
                    if (returnCaseItem.getReturnItems().empty) {
                        returnItem = _return.createItem(returncaseitem_id);
                        returnItem.setReturnedQuantity(new dw.value.Quantity(returned_quantity, unit));
                    } else {
                        returnItem = returnCaseItem.getReturnItems().iterator().next();
                        returned_quantity += returnItem.returnedQuantity.value;
                        returnItem.setReturnedQuantity(new dw.value.Quantity(returned_quantity, unit));
                    }

                    if (returned_quantity == returnCaseItem.authorizedQuantity.value) {
                        returnCaseItem.setStatus('RETURNED');
                    }
                }
                if (returnCase.status.displayValue == 'RETURNED' || returnCase.status.displayValue == 'PARTIAL_RETURNED') {
                    OrderPickModel.refund(order, returnCase);
                } else if (returnCase.status.displayValue=='CANCELLED') {
                    _return.setStatus('COMPLETED');
                }
            }
        } catch (e) {
            Transaction.rollback();
            return new Status(Status.ERROR, 'completeReturnCaseError', dw.util.StringUtils.format('Error Occured in complete_return_case. Line : {0}. Message :{1}', e.lineNumber, e.message));
        }
        Transaction.commit();
    }
    
    if (orderInput.status == 'cancelled') {
        if (order.status == dw.order.Order.ORDER_STATUS_CANCELLED) {
            return new Status(Status.ERROR, 'cancelOrderError', 'Order already canceled.');
        }
        
        if (order.status == dw.order.Order.ORDER_STATUS_CREATED) {
            var placingStatus = Transaction.wrap(function () {
                return dw.order.OrderMgr.placeOrder(order);
            });
            
            if (placingStatus.status == dw.system.Status.ERROR) {
                return new Status(Status.ERROR, 'cancelOrderError', dw.util.StringUtils.format('Durring placing order error was occured. Message : {0}', placingStatus.message));
            }
        }
    }
    
    return new Status(Status.OK);
};


/**
 * the modifyPATCHResponse hook - called after patching an order- modifying patch response. 
 */
exports.modifyPATCHResponse = function(order, orderResponse) {
    var data = {};
    data.order_no = order.orderNo;
    var return_cases = [];
    var returnCasesIterator = order.getReturnCases().iterator();
    while (returnCasesIterator.hasNext()) {
        var rc = returnCasesIterator.next();

        var returncase_items = [];
        var returnCaseItemsInterator = rc.getItems().iterator();
        while (returnCaseItemsInterator.hasNext()) {

            //assumption: only one return item in a return case item 
            var rci = returnCaseItemsInterator.next();
            var product_id = '',
                product_name = '',
                item_text = '',
                returned_quantity = '',
                authorized_refund_amount='';
            if (rci.getLineItem()) {
                var lineItem = rci.getLineItem();
                product_id = lineItem.productID;
                product_name = lineItem.productName;
                item_text = lineItem.lineItemText;
                authorized_refund_amount = lineItem.proratedPrice.divide(lineItem.quantityValue).multiply(rci.getAuthorizedQuantity()).value;
            }
            if (!rci.getReturnItems().empty) {
                var returnItem = rci.getReturnItems().iterator().next();
                returned_quantity = returnItem.getReturnedQuantity().value;
            }

            returncase_items.push({
                orderitem_id: rci.getOrderItemID(),
                returncaseitem_id: rci.getItemID(),
                authorized_quantity: rci.getAuthorizedQuantity().value,
                authorized_refund_amount: authorized_refund_amount,
                returned_quantity: returned_quantity,
                product_id: product_id,
                product_name: product_name,
                item_text: item_text,
                returncase_item_status: rci.getStatus().displayValue,
                reason_code: rci.getReasonCode().displayValue,
                note: rci.getNote()
            });
        }

        //assumption : only one return for one return case
        var return_number = '';
        var return_status = '';
        if (!rc.returns.empty) {
            var _return = rc.returns.iterator().next();
            return_number = _return.getReturnNumber();
            return_status = _return.getStatus().displayValue;
        }
        return_cases.push({
            returncase_createddate: rc.getCreationDate().toString(),
            returncase_modifieddate: rc.getLastModified().toString(),
            returncase_number: rc.getReturnCaseNumber(),
            returncase_status: rc.getStatus().displayValue,
            return_number: return_number,
            return_status: return_status,
            is_rma: rc.isRMA(),
            returncase_items: returncase_items
        })

    }
    data.return_cases = return_cases;
    orderResponse.c_data = data;
    return new Status(Status.OK);
};

/**
 * the modifyGETResponse hook - modifying get response  
 */
exports.modifyGETResponse = function(order, orderResponse) {
    var method;
    if (request.httpParameters.get('c_method')){
        method = request.httpParameters.get('c_method')[0]    	
    }
    //get return cases
    if (method === 'get_return_cases') {
        var data = {};
        data.order_no = order.orderNo;
        var return_cases = [];
        var returnCasesIterator = order.getReturnCases().iterator();
        while (returnCasesIterator.hasNext()) {
            var rc = returnCasesIterator.next();
            var returncase_items = [];
            var returnCaseItemsInterator = rc.getItems().iterator();
            while (returnCaseItemsInterator.hasNext()) {
                //assumption: only one return item in a return case item 
                var rci = returnCaseItemsInterator.next();
                var product_id = '',
                    product_name = '',
                    item_text = '',
                    returned_quantity = '',
                    authorized_refund_amount = '';
                if (rci.getLineItem()) {
                    var lineItem = rci.getLineItem();
                    product_id = lineItem.productID;
                    product_name = lineItem.productName;
                    item_text = lineItem.lineItemText;
                    authorized_refund_amount = lineItem.proratedPrice.divide(lineItem.quantityValue).multiply(rci.getAuthorizedQuantity()).value;
                }
                if (!rci.getReturnItems().empty) {
                    var returnItem = rci.getReturnItems().iterator().next();
                    returned_quantity = returnItem.getReturnedQuantity().value;
                }
                returncase_items.push({
                    orderitem_id: rci.getOrderItemID(),
                    returncaseitem_id: rci.getItemID(),
                    authorized_quantity: rci.getAuthorizedQuantity().value,
                    authorized_refund_amount: authorized_refund_amount,
                    returned_quantity: returned_quantity,
                    product_id: product_id,
                    product_name: product_name,
                    item_text: item_text,
                    returncase_item_status: rci.getStatus().displayValue,
                    reason_code: rci.getReasonCode().displayValue,
                    note: rci.getNote()
                });
            }

            //assumption : only one return for one return case
            var return_number = '';
            var return_status = '';
            if (!rc.returns.empty) {
                var _return = rc.returns.iterator().next();
                return_number = _return.getReturnNumber();
                return_status = _return.getStatus().displayValue;
            }
            return_cases.push({
                returncase_createddate: rc.getCreationDate().toString(),
                returncase_modifieddate: rc.getLastModified().toString(),
                returncase_number: rc.getReturnCaseNumber(),
                returncase_status: rc.getStatus().displayValue,
                return_number: return_number,
                return_status: return_status,
                is_rma: rc.isRMA(),
                returncase_items: returncase_items
            })

        }
        data.return_cases = return_cases;
        orderResponse.c_data = data;
    }

    //get returnable items
    if (method === 'get_returnable_items') {
        //modify pli for returns
        for (let i = 0; i < orderResponse.product_items.length; i++) {
            var pli = orderResponse.product_items[i];
            var order_pli = order.getProductLineItems(pli.product_id)[0];
            if (order_pli.custom.returnAvailableQuantity == null) {
                pli.c_returnAvailableQuantity = order_pli.quantityValue;
            }
            pli.c_orderitem_id = order_pli.orderItem.itemID;
            //setting category 
            var category = order_pli.getCategory();
            if (empty(category)){
                if (order_pli.product && order_pli.product.getPrimaryCategory()){
                    category = order_pli.product.getPrimaryCategory();
                } else if (!empty(order_pli.product && order_pli.product.getOnlineCategories())){
                    category = order_pli.product.getOnlineCategories()[0];
                } else {
                    category = 'root';
                }
            }
            if (category !='root'){
                pli.c_category = { 
                    name: category.displayName,
                    ID: category.ID
                }
            } else {
                pli.c_category = { 
                    name: 'root',
                    ID: 'root'
                }
            }
            
        }
        //modify shipping line items for returns - not working. Check with Neeraj
        for (let i = 0; i < orderResponse.shipping_items.length; i++) {
            var sli = orderResponse.shipping_items[i];
            var item_id = sli.item_id;
            var shippingLineItemsIterator = order.defaultShipment.getShippingLineItems().iterator();
            while (shippingLineItemsIterator.hasNext()) {
                var order_sli = shippingLineItemsIterator.next();
                if (order_sli.UUID == item_id) {
                    if (order_sli.custom.isAvailableForReturn == null) {
                        sli.c_isAvailableForReturn = true;
                    }
                    sli.c_orderitem_id = order_sli.orderItem.itemID;
                    break;
                }
            }
        }
    }
    //Adding Product Variation Info 
    for (let productIndex = 0; productIndex < orderResponse.product_items.length; productIndex++){        	 	
    	//Get the Product Id
    	var product = ProdMgr.getProduct(orderResponse.product_items[productIndex].product_id);        	       	
    	var variantInfo = '';        	
    	//Get the Variant Information based on Product Id        	
    	if (product.variant){
    		//Get product variation model
    		var prdVariationModel = product.getVariationModel();
    		var variantAttributes = prdVariationModel.getProductVariationAttributes();
    		var variantInfo = '';
    		//For each attribute, get the display name and value
    		var delimiter = '';
    		for (let index = 0; index < variantAttributes.length; ++index){
    			var variationVal = prdVariationModel.getVariationValue(product,variantAttributes[index]).displayValue;		
    			if (variantInfo.length !== 0){
    				delimiter = " ; "
    			}
			variantInfo += delimiter + variantAttributes[index].displayName + ':' + variationVal ;
    		}   		   		    		
    	}	
    	orderResponse.product_items[productIndex].c_variantInfo = variantInfo;  	
    }
    //Adding Product Variation Info 
    return new Status(Status.OK);
};
