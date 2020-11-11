# Salesforce B2C Commerce & OMS Integration Use Cases
*Requesting & connecting the B2C commerce & Salesforce OMS is the prerequisite for this repo.*

## Purpose
Purpose of this repo is to provide a design guidance & sample implementation to the Developers/Architects of the most common use cases. The idea is to provide the basic sample implementation which can be leveraged by the community to design & develop the other use cases. By using this repo, you do not need to start from the scratch -- use this as the guidance/starting point for your own implementations.

*This work is my personal effort & is not eligible for Salesforce support. Any entity/myslef/organization is legally bound. Users of this repo own the full responsibility of their solutions.


## Use cases supported
This repo supports three most commoin use cases:
1) Getting the **Order status** from Salesforce OMS in B2C Commerce.
2) Slef-Service: **Cancellations** : canceling the order line items.
3) Slef-Service: **Returns** : returning the order line items.

## Design Principle

As opposed to the traditional approach of getting the order status/updates back in commerce from OMS, this implementation relies on getting the order details in realtime from OMS, over the API calls.

**Customer Resolution:** In OMS, customer resolution works on the email address -- orders with the same email address, gets associated with the same Person Account. This repo honors the OMS resolution strategy.

*I believe that the Commerce is the engine for transactions, once the order is placed -- commerce is not required to know the order life cycle updates/details -- OMS is the right place to manage/persist those details. Commerce should just get this info from OMS on requirement basis.

- This implementation uses the custom REST APEX APIs & Connect APIs from core to get the order status & for cancellations & returns.

(docs/architecture.jpeg)

For this implementation to work, getting the OMS & commerce cloud connected is the prerequisite -- raise a support case for that.
Once connected, this implementation uses a custom build REST APEX API to get the order status from OMS. And for cancellations & returns it also uses the Connect APIs along with REST APIs.

**Using Service Cloud B2C Connector:** This implementation is based on the [B2C Service cloud connector](https://github.com/SalesforceCommerceCloud/service-cloud-connector). It is used to leverage the underlying connectivity code & config in Commerce Cloud -- like calling the service via the Service Framework & using the service metadata to configure the service. The idea is not write the entire infrastructural code again because at the end of the day for OMS also we are calling the services from core platform.
*However, if you wish to not to use the SC connector cartridges -- it's possible, but you would need to manage/write the infrastructural code/config for your implementation.

## Config Changes
- This implementation expects a [Connected App](https://help.salesforce.com/articleView?id=connected_app_create.htm&type=5) to be configiured in the Salesforce OMS -- this will allow the Commerce to call the REST APIs.
- In commerce cloud, in order to call the REST service in OMS -- you would need to configure the Service details that you will get after configuring the Connected App in OMS.

## Code Changes

### Changes on OMS side
For implementing these use cases, OMS needs to listen for the incoming requests from Commerce, for that we need to write a REST API -- an APEX class. 

[OrderManagementServiceForCommerce.cls](https://github.com/pravngaur/SFCC-OMS-Integration/blob/master/OMS%20Changes/OrderManagementServiceForCommerce.cls) class implements the APEX REST api for the required oprations.
It's available at /OrderManagement/ URI & has:
- A GET implementation for returning the Order Statuses for the provded Email Address.
- A POST implementation for cancellations & returns.

### Changes on Commerce side
- [Order.js](storefront-reference-architecture-master/cartridges/plugin_service_cloud/cartridge/controllers/Order.js) This controller needs to be extended to accommodate 3 Routes -- for Getting Order Status, Cancellations & Returns.
- [account.js](storefront-reference-architecture-master/cartridges/int_service_cloud/cartridge/scripts/hooks/account.js) This script needs to modified to have the implementations of the hooks which will be called from the controller -- this script is making the API call to OMS.
- [OMSOrder.js](storefront-reference-architecture-master/cartridges/int_service_cloud/cartridge/scripts/models/OMSOrder.js) This is an additional Model to hold the response returned from OMS.
- [orderHistoryCard.isml](storefront-reference-architecture-master/cartridges/plugin_service_cloud/cartridge/templates/default/account/order/orderHistoryCard.isml) ISML to be modified to display the order status & to show the option for cancellation/returns.

## TODO(s):
As i said, this is a sample implementation -- hence there are some assumptions made for this implementations which will not be true for a productioned version & these are the changes that you would need to consider/implement for your customizations:

- This implementation sends the Order status to ISML as returned from OMS, ideally you need to map the OMS statuses to the custom customer facing statuses -- show the some highlevel statuses to customers, not OMS statuses.
 * As of now, cancel link is available for all the Orders, irrespective of it's status in OMS. Ideally you should limit the cancellation link to the statuses which allow customers to cancel a line item/order.
- For this demo implementation, for cancellations & returns I am assuming the first item in the Order to be cancelled/returned. But, for your productionized customizations this needs to be handled in the UI -- giving customers the opportunity to select the line item & the quantity for cancellations & returns.
- This implementation does not handle the REFUNDS & Cash memo creation after the cancellation -- you need to implement that in accordance to your requirements.

**This is not the definite list but what i believe would be required for most of the cutsomer engagements -- please review your requirements to close down the gaps.**

