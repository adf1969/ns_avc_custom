/**
 * avc_test_custom_cs.ts
 *
 * @NScriptName AVC | Testing Custom | CS
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations for Testing - Client Script
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
// @ts-ignore
import search = require("N/search");
// @ts-ignore
import {LookupValueObject} from "N/search";

export let fieldChanged: EntryPoints.Client.fieldChanged = (context: EntryPoints.Client.fieldChangedContext) => {
  log.debug('fieldChanged', JSON.stringify(context));
}
export let lineInit: EntryPoints.Client.lineInit = (context: EntryPoints.Client.lineInitContext) => {
  log.debug('lineInit', JSON.stringify(context));
}
export let pageInit: EntryPoints.Client.pageInit = (context : EntryPoints.Client.pageInitContext) => {
  log.debug('pageInit', JSON.stringify(context));
}
export let postSourcing: EntryPoints.Client.postSourcing = (context: EntryPoints.Client.postSourcingContext) => {
  log.debug('postSourcing', JSON.stringify(context));
}
export let saveRecord: EntryPoints.Client.saveRecord = (context: EntryPoints.Client.saveRecordContext) => {
  log.debug('saveRecord', JSON.stringify(context));
  return true;
}
export let sublistChanged: EntryPoints.Client.sublistChanged = (context: EntryPoints.Client.sublistChangedContext) => {
  log.debug('sublistChanged', JSON.stringify(context));
}
export let validateDelete: EntryPoints.Client.validateDelete = (context:EntryPoints.Client.validateDeleteContext) => {
  log.debug('validateDelete', JSON.stringify(context));
  return true;
}
export let validateField: EntryPoints.Client.validateField = (context:EntryPoints.Client.validateFieldContext) => {
  log.debug('validateField', JSON.stringify(context));
  return true;
}
export let validateInsert: EntryPoints.Client.validateInsert = (context:EntryPoints.Client.validateInsertContext) => {
  log.debug('validateInsert', JSON.stringify(context));
  return true;
}
export let validateLine: EntryPoints.Client.validateLine = (context:EntryPoints.Client.validateLineContext) => {
  log.debug('validateLine', JSON.stringify(context));
  return true;
}

