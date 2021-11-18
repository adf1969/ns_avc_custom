/**
 * avc_journal_delfull_massu.ts
 *
 * @NScriptName AVC Journal Delete Full - MassUpdate Script
 * @NScriptType MassUpdateScript
 * @NApiVersion 2.1
 *
 */

/** NOT USED */

// Deletes a FULL Journal Entry record and ALL Related Records with the same tranId as Any
// Record that is selected by Filter
import {EntryPoints} from "N/types";
import MassUpdate = EntryPoints.MassUpdate;
import log = require('N/log');
import search = require("N/search");
// @ts-ignore
import record = require('N/record');

function deleteJournalFull(context: MassUpdate.eachContext) {

  // Delete ANY FULL Journal Entry Record that matches the Query
  log.debug('deleteJournalFull', 'Delete: ' + context.id);
  log.debug('deleteJournalFull:context', JSON.stringify(context));
  /*
  record.delete({
    type: context.type,
    id: context.id
  });
  */
  delRelatedJE_All(context.id);

}
export = {
  each: deleteJournalFull
}

function delRelatedJE_All(tranId) {
  let stLogTitle = 'delRelatedJE_All';
  log.debug(stLogTitle + 'Delete:',  tranId);
  let jeSearch = search.create({
    type: 'journalentry',
    filters: [
      ['type', 'anyof', 'Journal'],
      'AND',
      ['number', 'equalto', tranId],
    ],
    columns: [
      'tranid'
      ,'internalid'
    ],
  });
  let searchResults = jeSearch.run();
  searchResults.each(delJE);

  function delJE(result) {
    log.debug(stLogTitle + ':delJE', 'Delete: ' + result.getValue({name: 'tranid'}));
    log.debug(stLogTitle + ':delJE:result', JSON.stringify(result));
    return true;
  }
}
