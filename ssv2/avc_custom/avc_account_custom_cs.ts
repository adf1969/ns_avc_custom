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
//import currentRecord = require('N/currentRecord');
import url = require('N/url');

// @ts-ignore
import log = require('N/log');
//import {LookupValueObject} from "N/search";
//import search = require("N/search");

let AVC_DS_CUSTOM_RECORD_ID = 'customrecord_avc_ds_data';
/*
* From the debugger, global vars I have access to:
* *
 */
export let pageInit: EntryPoints.Client.pageInit = (context : EntryPoints.Client.pageInitContext) => {

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