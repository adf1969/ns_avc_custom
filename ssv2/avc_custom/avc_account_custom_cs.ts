/**
 * avc_account_custom_cs.ts
 *
 * @NScriptName AVC | Account Custom | CS
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations to Account Form - Client Script
 */

/** NOTE: This Script does NOT need to be Deployed unless I add additional Code to the pageInit
 *    This is a Script used by the UE script to provide the Client Script code for the Buttons.
 *    It just needs to be uploaded and it is accessible to that Script
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import currentRecord = require('N/currentRecord');
import url = require('N/url');

// @ts-ignore
import log = require('N/log');
//import {LookupValueObject} from "N/search";
import search = require("N/search");

let AVC_DS_CUSTOM_RECORD_ID = 'customrecord_avc_ds_data';
// @ts-ignore
let AVC_DS_CUSTREC_DSRECID_FLD = 'custrecord_avc_ds_dsrecid';
/*
* From the debugger, global vars I have access to:
* *
 */
export let pageInit: EntryPoints.Client.pageInit = (context : EntryPoints.Client.pageInitContext) => {
  log.debug('pageInit', JSON.stringify(context));

  let cRecord = context.currentRecord;
  // @ts-ignore
  let acctType = cRecord.getValue('accttype');

  /*
  if (acctType == 'Bank') {
    log.debug('pageInit', 'AcctType = Bank');
    // Check and see if the custrecord_avc_ds_dsrecid field is set, if not, set it to this ID
    let acctId = cRecord.getValue('id');
    let acctDsRecordId = cRecord.getValue(AVC_DS_CUSTREC_DSRECID_FLD);
    if (!acctDsRecordId) {
      // Field is Empty, set it if we can
      log.debug('pageInit', 'Field ' + AVC_DS_CUSTREC_DSRECID_FLD + ' is Blank');
      let dsRecordId = getDSRecordId(acctId);
      if (dsRecordId) {
        // We have a DS Record, Set custrecord_avc_ds_dsrecid
        cRecord.setValue( {fieldId: AVC_DS_CUSTREC_DSRECID_FLD, value: dsRecordId});
      }
    } else {
      // Field has a value, leave it
      log.debug('pageInit', 'Field ' + AVC_DS_CUSTREC_DSRECID_FLD + ' has value ' + acctDsRecordId);
    }
  }
  */
}

export function newDSRecord(acctId) {
  //const aRec = currentRecord.get();
  debugger;
  if (!acctId) return false;
  const dsUrl = url.resolveRecord({
    recordType: AVC_DS_CUSTOM_RECORD_ID,
    recordId: '',
    isEditMode: true,
    params:{'record.custrecord_avc_ds_account': acctId}
  });

  window.open(dsUrl);
}

export function editDSRecord(dsRecordId) {
  //const aRec = currentRecord.get();
  debugger;
  if (!dsRecordId) return false;
  const dsUrl = url.resolveRecord({
    recordType: AVC_DS_CUSTOM_RECORD_ID,
    recordId: dsRecordId,
    isEditMode: true
  });

  window.open(dsUrl);
}

// @ts-ignore
function getDSRecordId(accountId) {
  if (!accountId) return false;
  // Search the DS Custom Record for a Record that links to This Acct
  let dsResult = getAvcDsResultFromAccountId(accountId);
  if (dsResult) {
    // We found a Record, return ID
    return dsResult.getValue('internalid');
  } else {
    // We didn't find a Record, we will need to CREATE one
    return false;
  }
}

function getAvcDsResultFromAccountId(accountId) {
  if (!accountId) return false;
  let stLogTitle = 'getAvcDsResultFromAccountId';
  let dsSearch = search.create({
    type : AVC_DS_CUSTOM_RECORD_ID,
    columns: [
      'internalid',
      'custrecord_avc_ds_account_name',
      'custrecord_avc_ds_fininst',
      'custrecord_avc_ds_fininst_name',
      'custrecord_avc_ds_fininst_address_1',
      'custrecord_avc_ds_fininst_address_2',
      'custrecord_avc_ds_account_address_line_1',
      'custrecord_avc_ds_account_address_line_2',
      'custrecord_avc_ds_account_desc_1',
      'custrecord_avc_ds_account_desc_2',
      'custrecord_avc_ds_bankacct_fracnum',
      'custrecord_avc_ds_bankacct_last4',
      'custrecord_avc_ds_bankacct_micr_data'
    ],
    filters: [
      ['custrecord_avc_ds_account', search.Operator.IS, accountId]
    ]
  });
  let searchResults = dsSearch.run().getRange({start: 0, end: 1});
  log.debug(stLogTitle, 'searchResults = ' + JSON.stringify(searchResults));
  if (searchResults.length == 1) {
    let objAvcDsFields = searchResults[0];
    log.debug(stLogTitle, 'ObjAvcDsFields = ' + JSON.stringify(objAvcDsFields));
    return objAvcDsFields;
  }
  return false;
}