/**
 * avc_deposit_custom_ue.ts
 *
 * @NScriptName AVC | Deposit Custom | UE
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations to Deposit Form - User Event Script
 */

import {EntryPoints} from "N/types";
import log = require('N/log');
import search = require("N/search");
import serverWidget = require('N/ui/serverWidget');
import {LookupValueObject} from "N/search";

export function beforeLoad(context: EntryPoints.UserEvent.beforeLoadContext) {
  // Only run in Create/Edit/Copy/View Modes
  if ([context.UserEventType.CREATE, context.UserEventType.COPY,
    context.UserEventType.EDIT, context.UserEventType.VIEW].includes(context.type)) {
    log.debug('Before Load', context.type);

    let form = context.form;

    // Set the Location if the Account has a Default
    let accountId = context.newRecord.getValue({fieldId: 'account'});
    let defaultLoc = getAccountDefaultLocId(accountId);
    if (defaultLoc) {
      context.newRecord.setValue({fieldId: 'location', value: defaultLoc});
    }


    // Hide the Department & Class fields on every SubList
    //let newRec = context.newRecord;

    try {
      let slPayment = form.getSublist({id: 'payment'});
      // Remove Columns from the Cashback Sublist that we don't need
      slPayment.getField({id: 'department'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
      slPayment.getField({id: 'class'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
    } catch (error) {
      // Do Nothing
    }

    try {
      let slOther = form.getSublist({id:'other'});
      // Remove Columns from the Other Deposits Sublist that we don't need
      slOther.getField({id: 'department'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
      slOther.getField({id: 'class'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
    } catch (error) {
      // Do Nothing
    }

    try {
      let slCashBack = form.getSublist({id:'cashback'});
      // Remove Columns from the Cashback Sublist that we don't need
      slCashBack.getField({id: 'department'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
      slCashBack.getField({id: 'class'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
    } catch (error) {
      // Do Nothing
    }
  }
}

// Given an Account, retrieve that Account's Default Location Id
// @ts-ignore
function getAccountDefaultLocId(accountId) {
  if (!accountId) return false;
  let stLogTitle = 'getAccountDefaultLocId';
  let defaultLoc = search.lookupFields({
    type: search.Type.ACCOUNT,
    id: accountId,
    columns: ['custrecord_avc_account_default_loc']
  });
  log.debug(stLogTitle + ':defaultLoc', defaultLoc);
  let locArr = defaultLoc.custrecord_avc_account_default_loc as Array<LookupValueObject>;
  if (locArr && locArr.length > 0) {
    return locArr[0].value;
  }
  return false;
}