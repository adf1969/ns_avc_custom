/**
 * avc_journal_massupdate.ts
 *
 * @NScriptName AVC Journal Custom MassUpdate Script
 * @NScriptType MassUpdateScript
 * @NApiVersion 2.1
 *
 */

/** NOT USED */

import {EntryPoints} from "N/types";
import MassUpdate = EntryPoints.MassUpdate;
//import log = require('N/log');
//import search = require("N/search");
import record = require('N/record');

function deleteJournal(context: MassUpdate.eachContext) {

  // Delete ANY FULL Journal Entry Record that matches the Query
  record.delete({
    type: context.type,
    id: context.id
  });

}
export = {
  each: deleteJournal
}
