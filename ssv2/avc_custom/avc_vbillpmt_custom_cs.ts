/**
 * avc_vbillpmt_custom_cs.ts
 *
 * @NScriptName AVC | Vendor Bill Pmt Custom | CS
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 * File Version: 1.0-2021-12-21-17:42:29
 * Purpose: Purpose: AVC Customizations to Vendor Bill Payment Form - Client Script
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
import {LookupValueObject} from "N/search";
import search = require("N/search");

/*
* From the debugger, global vars I have access to:
* *
 */
export let pageInit: EntryPoints.Client.pageInit = (context : EntryPoints.Client.pageInitContext) => {
  let stLogTitle = 'pageInit';
  log.debug(stLogTitle + ':context', JSON.stringify(context));

  debugger;
  let url = new URL(document.location.href);
  let billId = url.searchParams.get('bill');
  log.debug(stLogTitle + ':billId', billId);

  let cRecord = context.currentRecord;
  log.debug(stLogTitle + ':cRecord', JSON.stringify(cRecord));

  if (['create'].includes(context.mode)) {
    // Set ToBePrinted = True
    cRecord.setValue({
      fieldId: 'tobeprinted',
      value: true
    });
  }

  if (['create', 'edit'].includes(context.mode)) {
    // Get Bill Fields
    if (billId) {
      // @ts-ignore
      let billResult = getAvcBillResult(billId);
      log.debug(stLogTitle +":billResult", JSON.stringify(billResult));
      if (billResult) {
        let locId = cRecord.getValue({fieldId: 'location'});
        let billLocationId = billResult.getValue('location');
        if (!locId) {
          log.debug(stLogTitle, `Found Bill. Set Location to: ${billLocationId}`);
          cRecord.setValue({fieldId: 'location', value: billLocationId});
        }
      }
    }
    // If Subsidiary Set, and Location is Still Blank, set the Location to the Default, if one is set
    let subId = cRecord.getValue({fieldId: 'subsidiary'});
    let locId = cRecord.getValue({fieldId: 'location'});
    if (subId && !locId) {
      let defaultLocId = getDefaultLocId(subId);
      if (defaultLocId) {
        log.debug('pageInit', `Set Location to: ${defaultLocId}`)
        cRecord.setValue({fieldId: 'location', value: defaultLocId});
      }
    }

    // If we have a Location, get the Default Bank Acct for that Location and Set the Default Bank Acct,
    // Check if Create or Edit to detemrine whether to set.
    locId = cRecord.getValue({fieldId: 'location'});
    if (locId) {
      let defBankAcct = getLocDefaultAPBankAcct(locId);
      if (defBankAcct) {
        // set the Account to the Location Default?
        // On Create, set it to the Default for this Location, not matter what.
        if (context.mode == 'create') {
          cRecord.setValue({fieldId: 'account', value: defBankAcct});
        }

        // Only set on Edit, if Account is Blank
        if (context.mode == 'edit') {
          let accountId = cRecord.getValue('account');
          if (!accountId) {
            cRecord.setValue({fieldId: 'account', value: defBankAcct});
          }
        }
      }
    }
  }



}

export let postSourcing: EntryPoints.Client.postSourcing = (context: EntryPoints.Client.postSourcingContext) => {
  // @ts-ignore
  log.debug('postSourcing', `context.fieldId: ${context.fieldId}`);
  if (context.fieldId == 'subsidiary') {
    //debugger;
    log.debug('postSourcing:context.currentRecord', JSON.stringify(context.currentRecord));
    let cRecord = context.currentRecord;
    let subId = cRecord.getValue({fieldId: 'subsidiary'});
    log.debug('postSourcing:subsidiary', subId);
    let defaultLocId = getDefaultLocId(subId);
    log.debug('postSourcing:sub.defaultLocId', defaultLocId);

    // Found a Default Location, now set the Location to that Default
    if (defaultLocId) {
      log.debug('postSourcing', `Set Location to: ${defaultLocId}`)
      cRecord.setValue({fieldId: 'location', value: defaultLocId});
    }
  }
}

// Given a Subsidiary, retrieve that Subsidiary's Default Location Id
function getDefaultLocId(subId) {
  if (!subId) return false;
  let defaultLoc = search.lookupFields({
    type: search.Type.SUBSIDIARY,
    id: subId,
    columns: ['custrecord_avc_default_loc']
  });
  log.debug('postSourcing:sub.defaultLoc', defaultLoc);
  let locationArr = defaultLoc.custrecord_avc_default_loc as Array<LookupValueObject>;
  if (locationArr.length > 0) {
    return locationArr[0].value;
  }
  return false;
}

// Get the Bill Fields
// @ts-ignore
function getAvcBillResult(billId) {
  let stLogTitle = 'getAvcBillResult';
  let dsSearch = search.create({
    type : search.Type.VENDOR_BILL,
    columns: [
      'subsidiary',
      'location'
    ],
    filters: [
      ['internalid', search.Operator.IS, billId]
    ]
  });
  let searchResults = dsSearch.run().getRange({start: 0, end: 1});
  log.debug(stLogTitle, 'searchResults = ' + JSON.stringify(searchResults));
  if (searchResults.length == 1) {
    let objAvcBillResult = searchResults[0];
    log.debug(stLogTitle, 'objAvcBillResult = ' + JSON.stringify(objAvcBillResult));
    return objAvcBillResult;
  }
  return false;
}

// Get the Location Fields
// @ts-ignore
function getAvcLocationResult(locId) {
  if (!locId) return false;
  let stLogTitle = 'getAvcLocationResult';
  let dsSearch = search.create({
    type : search.Type.LOCATION,
    columns: [
      'custrecord_avc_default_ap_bankacct'
    ],
    filters: [
      ['internalid', search.Operator.IS, locId]
    ]
  });
  let searchResults = dsSearch.run().getRange({start: 0, end: 1});
  log.debug(stLogTitle, 'searchResults = ' + JSON.stringify(searchResults));
  if (searchResults.length == 1) {
    let objAvcLocResult = searchResults[0];
    log.debug(stLogTitle, 'objAvcLocResult = ' + JSON.stringify(objAvcLocResult));
    return objAvcLocResult;
  }
  return false;
}

// @ts-ignore
function getLocDefaultAPBankAcct(locId) {
  if (!locId) return false;
  log.debug('getLocDefaultAPBankAcct:locId', locId);
  // @ts-ignore
  let stLogTitle = 'getLocDefaultAPBankAcct';
  let locResult = getAvcLocationResult(locId);
  if (locResult) {
    let bankAcct = locResult.getValue('custrecord_avc_default_ap_bankacct');
    log.debug('getLocDefaultAPBankAcct:custrecord_avc_default_ap_bankacct', bankAcct);
    return bankAcct;
  }
  return false;
}

