/**
 * avc_location_custom_cs.ts
 *
 * @NScriptName AVC | Location Custom | CS
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations for Location Form - Client Script *** NOT USED: NS doesn't allow Scripts on Location Forms ***
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
// @ts-ignore
import search = require("N/search");
// @ts-ignore
import {LookupValueObject} from "N/search";
// @ts-ignore
import * as avc from "./avc_util";

export let fieldChanged: EntryPoints.Client.fieldChanged = (context: EntryPoints.Client.fieldChangedContext) => {
  log.debug('fieldChanged', JSON.stringify(context));
}

export let pageInit: EntryPoints.Client.pageInit = (context : EntryPoints.Client.pageInitContext) => {
  log.debug('pageInit', JSON.stringify(context));
}
export let postSourcing: EntryPoints.Client.postSourcing = (context: EntryPoints.Client.postSourcingContext) => {
  log.debug('postSourcing', JSON.stringify(context));
  log.debug('postSourcing', `context.fieldId: ${context.fieldId}`);

  // SUBSIDIARY field
  if (context.fieldId == 'subsidiary') {
    //debugger;
    log.debug('postSourcing:context.currentRecord', JSON.stringify(context.currentRecord));
    let cRecord = context.currentRecord;
    let subId = cRecord.getValue({fieldId: 'subsidiary'});
    log.debug('postSourcing:subsidiary', subId);
    // Get Subsidiary Fields
    let subData = avc.getSubsidiaryFields(subId);
    if (subData && subData.name) {
      log.debug('postSourcing:subData', JSON.stringify(subData));
      //let subName = subData.name;
    }

  }
}


