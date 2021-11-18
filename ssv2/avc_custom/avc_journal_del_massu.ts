/**
 * avc_journal_del_massu.ts
 *
 * @NScriptName AVC | Journal: Delete | MU
 * @NScriptType MassUpdateScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Mass Update Script to Delete Journal Entry Records
 */

// Deletes ONE Journal Entry, even a part, does NOT check to ensure the entire JE is deleted
import {EntryPoints} from "N/types";
import MassUpdate = EntryPoints.MassUpdate;
import log = require('N/log');
//import search = require("N/search");
import record = require('N/record');

function deleteJournal(context: MassUpdate.eachContext) {
  let stLogTitle = 'deleteJournal';
  // Delete ANY Journal Entry Record that matches the Query
  log.debug(stLogTitle + ':context', 'Delete: ' + JSON.stringify(context));
  try {
    record.delete({
      type: context.type,
      id: context.id
    });
  }
  catch (error) {
    // We will end up here many times since the result set returns duplicates, we just Log and move on.
    if (error.id == 1053) {
      // This is Record Does Not Exist, log a Debug, but otherwise, do nothing
      log.debug(stLogTitle + ':error', error.message);
    } else {
      log.error(stLogTitle, error.message);
      log.error(stLogTitle + ':error', JSON.stringify(error));
    }


  }


}
export = {
  each: deleteJournal
}
