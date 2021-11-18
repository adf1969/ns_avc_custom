/**
 * avc_account_udf_massu.ts
 *
 * @NScriptName AVC | Account:Update DS Fields | MU
 * @NScriptType MassUpdateScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Mass Update Script to update Deposit Slip Fields in Account Records of type Bank
 */

import {EntryPoints} from "N/types";
import MassUpdate = EntryPoints.MassUpdate;
import log = require('N/log');
import search = require("N/search");
import record = require('N/record');

let AVC_DS_CUSTOM_RECORD_ID = 'customrecord_avc_ds_data';
function updateAccount(context: MassUpdate.eachContext) {
  let bUpdateRec:boolean = false;
  // Load the Record
  let aRec = record.load({
    type: context.type,
    id: context.id
  });
  let acctId = context.id;
  // Modify the Record Values
  let dsRecordId = getDSRecordId(acctId);
  if (dsRecordId) {
    // We have a DS Record, Update custrecord_avc_ds_dsrecid with ID value
    aRec.setValue('custrecord_avc_ds_dsrecid', dsRecordId);
    bUpdateRec = true;
  } else {
    // We do NOT have a DS Record, set custrecord_avc_ds_dsrecid to blank
    aRec.setValue('custrecord_avc_ds_dsrecid', '');
    bUpdateRec = true;
  }
  // 1-time test, update the records that I set before
  //aRec.setValue('custrecord_avc_ds_bank_account_name', '');
  //bUpdateRec = true

  // If we need to update the record, Save it.
  if (bUpdateRec) {
    // Save the Record
    aRec.save();
  }

}
export = {
  each: updateAccount
}

// @ts-ignore
function getDSRecordId(accountId) {
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
