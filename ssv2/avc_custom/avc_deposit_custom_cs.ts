/**
 * avc_deposit_custom_cs.ts
 *
 * @NScriptName AVC | Deposit Custom | CS
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations to Deposit Form - Client Script
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
import {LookupValueObject} from "N/search";
import search = require("N/search");


export let pageInit: EntryPoints.Client.pageInit = (context : EntryPoints.Client.pageInitContext) => {

}

export let fieldChanged: EntryPoints.Client.fieldChanged = (context: EntryPoints.Client.fieldChangedContext) => {
  //debugger;
  let stLogTitle = 'fieldChanged';
  log.debug(stLogTitle+':context', JSON.stringify((context)));
  if (context.sublistId == 'other' && context.fieldId == 'entity') {
    let cRec = context.currentRecord;
    let entityId = cRec.getCurrentSublistValue({
      sublistId: context.sublistId,
      fieldId: 'entity'
    });
    log.debug(stLogTitle+':entityId', entityId);
    if (entityId) {
      let defaultDepositAcctId = getDefaultDepositAcctId(entityId);
      log.debug(stLogTitle+':defaultDepositAcctId', defaultDepositAcctId);
      if (defaultDepositAcctId) {
        // Set the Account to the Default Acct Id
        log.debug(stLogTitle, `Set Account to: ${defaultDepositAcctId}`)
        cRec.setCurrentSublistValue({sublistId: context.sublistId, fieldId: 'account', value: defaultDepositAcctId});
      }
    }
  }

}

export let sublistChanged: EntryPoints.Client.sublistChanged = (context: EntryPoints.Client.sublistChangedContext) => {
  //log.debug('sublistChanged:context.sublistId', context.sublistId);
  //log.debug('sublistChanged:currentRecord', JSON.stringify((context.currentRecord)));
}

export let postSourcing: EntryPoints.Client.postSourcing = (context: EntryPoints.Client.postSourcingContext) => {
  debugger;
  let stLogTitle = 'postSourcing';
  // @ts-ignore
  log.debug(stLogTitle, `context.fieldId: ${context.fieldId}`);
  if (context.fieldId == 'account') {
    //debugger;
    log.debug(stLogTitle + ':context.currentRecord', JSON.stringify(context.currentRecord));
    let cRec = context.currentRecord;
    let acctId = cRec.getValue({fieldId: 'account'});
    log.debug(stLogTitle+':account', acctId);
    let defaultLocId = getAccountDefaultLocId(acctId);
    log.debug(stLogTitle + ':sub.defaultLocId', defaultLocId);

    // Found a Default Location, now set the Location to that Default
    if (defaultLocId) {
      log.debug(stLogTitle, `Set Location to: ${defaultLocId}`)
      cRec.setValue({fieldId: 'location', value: defaultLocId});
    }
  }
}

// Given a Customer or Vendor, retrieve that Customer's Default Deposit Account Id
// @ts-ignore
function getDefaultDepositAcctId(entityId) {
  if (!entityId) return false;
  let defaultAcct = search.lookupFields({
    type: search.Type.ENTITY,
    id: entityId,
    columns: ['custentity_avc_default_dep_acct']
  });
  log.debug('getDefaultDepositAcctId:defaultAcct', defaultAcct);
  let acctArr = defaultAcct.custentity_avc_default_dep_acct as Array<LookupValueObject>;
  if (acctArr && acctArr.length > 0) {
    return acctArr[0].value;
  }
  return false;
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