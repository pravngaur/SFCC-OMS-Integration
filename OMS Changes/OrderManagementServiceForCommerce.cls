/**
* Rest Service class for fetching the Order status in Commerce from OMS. And this class also facilitates the Order cancellation in OMS from Commerce 
* Account History modules.
*
*
* @author  Praveen Gaur
* @version 1.0
* @since   2020-10-21
*/

@RestResource(urlMapping='/OrderManagement/*')
global with sharing class OrderManagementServiceForCommerce {
	
    /**
     * This method enables commerce to query the Orders of a given customer.
     * Customer resolution is based on the email address -- all the orders of the provided email address will be returned.
     **/
    @HttpGet
    global static List<OrderSummary> getOrder() {
        String emailAddress = RestContext.request.requestURI.replace('/OrderManagement/', '');
		//Querying the Contact Object
        String contectQuery = SCCQueryUtilClass.getInstance()
                .getQueryInstance()
                .setObjectName('Contact')
                .setAllFields()
                .setClause('Email = \'' + emailAddress + '\'')
                .getQuery();
        List<Contact> contactList = (List<Contact>)SCCQueryUtilClass.getRecords(contectQuery);
        
        //Querying the OrderSummary Object
        String orderQuery = SCCQueryUtilClass.getInstance()
                .getQueryInstance()
                .setObjectName('OrderSummary')
				.setRelatedFields(new Set<String>{'Id', 'OrderNumber','Status'})
                .setClause('AccountId = \'' + contactList[0].AccountId + '\'')
                .getQuery();
        List<OrderSummary> orderList = (List<OrderSummary>)SCCQueryUtilClass.getRecords(orderQuery);
        return orderList;
    }
    
    /**
     * This method enables commerce to cancel an OrderItemSummary or a product in a  given order.
     * Product cancellation happens only if the Fulfillment Order is in Cancelled state, else API error will be returned.
     * TODO: This does not handle the REFUNDS & Cash memo creation after the cancellation -- you need to implement that in accordance to your requirements.
     * 
     **/
     @HttpPost
    global static Boolean cancelOrderSummary(){
        Map<String, Object> jsonMap = (Map<String, Object>)System.JSON.deserializeUntyped(RestContext.request.requestBody.toString());
        String orderSummaryID = jsonMap.get('orderSummaryID').toString();
        String productCode = jsonMap.get('productCode').toString();
        Integer quantity = integer.valueOf(jsonMap.get('quantity'));
		//Querying OrderItemSummary to get the ID of the record with the matching OrderSummary & ProductCode 
        String contectQuery = SCCQueryUtilClass.getInstance()
                .getQueryInstance()
                .setObjectName('OrderItemSummary')
                .setAllFields()
                .setClause('OrderSummaryId = \'' + orderSummaryID + '\' and ProductCode = \'' + productCode + '\'')
                .getQuery();
        List<OrderItemSummary> orderItemSummaryList = (List<OrderItemSummary>)SCCQueryUtilClass.getRecords(contectQuery);

        if(orderItemSummaryList != null &&  !orderItemSummaryList.isEmpty() ){
            String orderItemSummaryID = String.valueOf(orderItemSummaryList[0].Id);
            ConnectApi.ChangeInputRepresentation changes = createChangeInput(orderItemSummaryID, quantity);
			ConnectApi.SubmitCancelOutputRepresentation returnValue = ConnectApi.OrderSummary.submitCancel(orderSummaryID, changes);
        }
        return true;
    }
	
    public static ConnectApi.ChangeInputRepresentation createChangeInput(String itemSummaryID, Integer quantity ) {
        ConnectApi.ChangeInputRepresentation changeInput = new ConnectApi.ChangeInputRepresentation();
        changeInput.changeItems = new List<ConnectApi.ChangeItemInputRepresentation>();
        ConnectApi.ChangeItemInputRepresentation changeItemObject = new ConnectApi.ChangeItemInputRepresentation();
        changeItemObject.reason = 'Damaged';//You must change this to get this information in the request from Commerce.
        changeItemObject.quantity = quantity;
        changeItemObject.shippingReductionFlag = true;//You must change this to get this information in the request from Commerce.
        changeItemObject.orderItemSummaryId = itemSummaryID;
        changeInput.changeItems.add(changeItemObject);
        return changeInput;
    }

}