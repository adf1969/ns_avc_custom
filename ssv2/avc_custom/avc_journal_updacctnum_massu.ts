/**
 * avc_journal_del_massu.ts
 *
 * @NScriptName AVC Journal Update Acct Num - MassUpdate Script
 * @NScriptType MassUpdateScript
 * @NApiVersion 2.1
 *
 */

/** NOT USED */

// Deletes ONE Journal Entry, even a part, does NOT check to ensure the entire JE is deleted
import {EntryPoints} from "N/types";
import MassUpdate = EntryPoints.MassUpdate;
import log = require('N/log');
//import search = require("N/search");
import record = require('N/record');
import {runtime} from "N";

function updateJournalAcctNum(context: MassUpdate.eachContext) {
  let stLogTitle = 'updateJournalAcctNum';
  // Get the Script Param - the New Acct #
  let objCurrScript = runtime.getCurrentScript();
  var paramOldAcct = objCurrScript.getParameter({
    name: 'custscript_avc_oldacctnum'
  });
  var paramNewAcct = objCurrScript.getParameter({
    name: 'custscript_avc_newacctnum'
  });
  if (!paramOldAcct || !paramNewAcct) return true;

  // Load the Record to Edit
  let bUpdateRec:boolean = false;
  let jeRec = record.load({
    type: context.type,
    id: context.id
  });
  log.debug(stLogTitle + ':jeRec', 'Delete: ' + JSON.stringify(jeRec));

  // Update all the Lines that match paramOldAcct with paramNewAcct
  let lines = jeRec.getLineCount({sublistId: 'line'});
  log.debug(stLogTitle + ':JE Lines', lines);
  for (let i = 0; i <= lines; i++ ) {
    let acctNum = jeRec.getSublistValue({
      sublistId: 'line',
      fieldId: 'account',
      line: i
    });
    // I need to test if the "acctNum" is an InternalID or if that is the actual Account Number (eg. 195.000)
    if (acctNum == paramOldAcct) {
      jeRec.setSublistValue({
        sublistId: 'line',
        fieldId: 'account',
        line: i,
        value: paramNewAcct
      });
      bUpdateRec = true;
    }
  }

  // If we need to update the record, Save it.
  if (bUpdateRec) {
    // Save the Record
    jeRec.save();
  }

}
export = {
  each: updateJournalAcctNum
}