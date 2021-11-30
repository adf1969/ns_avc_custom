/**
 * avc_avcdsdata_custom_ue.ts
 *
 * @NScriptName AVC | AVC Deposit Slip | UE
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations to Custom RecType: AVC Deposit Slip Form - User Event Script
 */

import {EntryPoints} from "N/types";
import log = require('N/log');
import record = require('N/record');
// @ts-ignore
//import {EnvType} from "N/runtime";
// @ts-ignore
//import search = require("N/search");

// @ts-ignore
let AVC_DS_CUSTOM_RECORD_ID = 'customrecord_avc_ds_data';
// @ts-ignore
let AVC_ACCOUNT_DSRECID_FLD = 'custrecord_avc_ds_dsrecid';
// @ts-ignore
let AVC_AVCDSREC_ACCOUNT_FLD = 'custrecord_avc_ds_account';

export function beforeSubmit(context: EntryPoints.UserEvent.beforeSubmitContext) {
  debugger;
  let stLogTitle = 'beforeSubmit';
  log.debug(stLogTitle, context.type);
}

export function afterSubmit(context: EntryPoints.UserEvent.afterSubmitContext) {
    debugger;
    let stLogTitle = 'afterSubmit';
    log.debug('afterSubmit:UserEventType', context.UserEventType);
    log.debug('afterSubmit:context', JSON.stringify(context));
    log.debug(stLogTitle, context.type);
    let newRecord = context.newRecord
    if ([context.UserEventType.CREATE, context.UserEventType.EDIT].includes(context.type)) {
      log.debug(stLogTitle + ':oldRecord', JSON.stringify(context.oldRecord));
      log.debug(stLogTitle + ':newRecord', JSON.stringify(context.newRecord));

      // Get the Account Id from custrecord_avc_ds_account
      // @ts-ignore
      let acctId = newRecord.getValue(AVC_AVCDSREC_ACCOUNT_FLD);
      let dsRecordId = newRecord.getValue('id');
      if (acctId && dsRecordId) {
        // We have an Account Id & DS ID
        // Assign this DS ID to the Account ID field: custrecord_avc_ds_dsrecid
        log.debug(stLogTitle, `Load Account with ID ${acctId}`);
        let aRec = record.load({
          type: record.Type.ACCOUNT,
          id: acctId
        });
        if (aRec) {
          let acct_dsRecordId = aRec.getValue(AVC_ACCOUNT_DSRECID_FLD);
          if (acct_dsRecordId != dsRecordId) {
            // ID Value in Account record doesn't match this AVC Deposit Slip record, Update Account record
            log.debug(stLogTitle, `Update ${AVC_AVCDSREC_ACCOUNT_FLD} field to ${dsRecordId}`);
            aRec.setValue(AVC_ACCOUNT_DSRECID_FLD, dsRecordId);
            aRec.save();
          }
        }
      }
  }
}