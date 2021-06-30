/**
 * avc_bill_custom_cs.ts
 *
 * @NScriptName AVC Bill Custom Client Script
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
import search = require("N/search");
import {LookupValueObject} from "N/search";

export let postSourcing: EntryPoints.Client.postSourcing = (context: EntryPoints.Client.postSourcingContext) => {
  // @ts-ignore
  log.debug('postSourcing', `context.fieldId: ${context.fieldId}`);
  if (context.fieldId == 'subsidiary') {
    //debugger;
    log.debug('postSourcing:context.currentRecord', JSON.stringify(context.currentRecord));
    let cRecord = context.currentRecord;
    let subId = cRecord.getValue({fieldId: 'subsidiary'});
    log.debug('postSourcing:subsidiary', subId);
    // Load the Subsidiary Record and see if there is a Default Location
    /*
    let defaultLoc = search.lookupFields({
      type: search.Type.SUBSIDIARY,
      id: subId,
      columns: ['custrecord_avc_default_loc']
    });
    log.debug('postSourcing:sub.defaultLoc', defaultLoc);
    let locationId = defaultLoc.custrecord_avc_default_loc;
    */
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