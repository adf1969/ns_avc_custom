/**
 * avc_account_custom_ue.ts
 *
 * @NScriptName AVC | Account Custom | UE
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations to Account Form - User Event Script
 */

// NOTE: In order to Debug this script, you must use the method here:
// https://6198441.app.netsuite.com/app/help/helpcenter.nl?fid=section_160417956946.html This uses the Debugger Login
// in NetSuite (https://debugger.na0.netsuite.com/app/common/scripting/scriptdebugger.nl?whence=) To use the 2.1 Script
// Debugger, select 2.1 as the API Version on the Script Debugger page. Once you click Debug Script, a new browser tab
// opens providing you with the Chrome DevTools interface for debugging your script. Your script will be displayed on
// the new tab and you will be able to pause/resume execution, set breakpoints, and step through your code line by
// line. - You can't just run the script in the Browser, since this is a SERVER-SIDE script, it must be run from the
// Debugger Login in NetSuite.
import {EntryPoints} from "N/types";
import {FieldDisplayType} from "N/ui/serverWidget";
import log = require('N/log');
import search = require("N/search");
import serverWidget = require('N/ui/serverWidget');

// Accessible Data for accessing
// context.newRecord.getValue('id') - gets the Account ID
// context.newRecord.getValue('accttype') - gets the Account Type ('Bank') is what we are testing for
// context.newRecord.getValue('acctname') - gets the Account Name (the user prinable name. eg: Albany-FNBA)
//
let AVC_DS_CUSTOM_RECORD_ID = 'customrecord_avc_ds_data';
export function beforeLoad(context: EntryPoints.UserEvent.beforeLoadContext) {
  debugger;
  // Only run in Edit/View Modes
  if ([context.UserEventType.EDIT, context.UserEventType.VIEW].includes(context.type)) {
    log.debug('Before Load', context.type);
    log.debug('beforeLoad:form', JSON.stringify(context.form));
    //context.form.addButton({id:'avc_account_edit_ds_rec', label: "Edit Deposit Slip Record", functionName: 'editDSRecord'});

    let form = context.form;

    // Is this a Bank Account?
    let acctType = context.newRecord.getValue('accttype');
    if (acctType == 'Bank') {
      // >> Bank Account
      // Get the AcctID
      let acctId = context.newRecord.getValue('id');
      // Check and see if there is an Associated DS Record for this Acct ID
      // @ts-ignore
      let dsRecordId = getDSRecordId(acctId);
      if (dsRecordId) {
        // We have a DS Record, display Edit button
        // To pass a param to function:
        //   functionName : 'functionSendRequest("' + someTextToPassToTheClientscript + '")'
        // Then receive it as follows in the ClientScript JS file:
        //    functionSendRequest(textReceivedFromSuitelet) {
        // See: https://stackoverflow.com/questions/42309781/pass-variables-from-suitelet-to-clientscript-in-2-x-api
        context.form.addButton({id:'custpage_avc_account_edit_ds_rec', label: "Edit Deposit Slip Record",
          functionName: 'editDSRecord("' + dsRecordId + '")' });
      } else {
        // We do NOT have a DS Record, display Create button
        context.form.addButton({id:'custpage_avc_account_add_ds_rec', label: "Add Deposit Slip Record",
          functionName: 'newDSRecord("' + acctId + '")' });
      }
      try {
        context.form.clientScriptModulePath = './avc_account_custom_cs.js';
      } catch (error) {}
    } else {
      // >> NOT a Bank Account
      // Hide fields that do NOT need to be displayed for Non-Bank Accounts
      //form.getField({id: 'custrecord_avc_account_default_loc'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
      try {
        setFieldDisplay(form, 'custrecord_avc_ds_bank_account_name', FieldDisplayType.HIDDEN);
        setFieldDisplay(form, 'custrecord_avc_ds_dsrecid', FieldDisplayType.HIDDEN);
        setFieldDisplay(form, 'custrecord_avc_ds_dsrecname', FieldDisplayType.HIDDEN);
        setFieldDisplay(form, 'custrecord_avc_account_default_loc', FieldDisplayType.HIDDEN);
      } catch (error) {}
    }
  }
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


/*
 * Gets the Custom Record Fields that contains all the Deposit Slip Data for creating the Deposit Slip
 * This record has a "link" to the Account record, which is how we find it.
 */
// @ts-ignore
function getAvcDSResult(depositRecord) {
  if (!depositRecord) return false;
  // @ts-ignore
  let stLogTitle = 'getAvcDSResult';
  let accountId = depositRecord.getValue({
    fieldId: 'account'
  });
  return getAvcDsResultFromAccountId(accountId);
}

function setFieldDisplay(form : serverWidget.Form, fieldId : string, displayType: serverWidget.FieldDisplayType) {
  form.getField({id: fieldId}).updateDisplayType({displayType: displayType});
}

