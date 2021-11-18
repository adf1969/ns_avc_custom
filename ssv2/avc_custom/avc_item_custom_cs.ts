/**
 * avc_item_custom_cs.ts
 *
 * @NScriptName AVC Item Custom Client Script
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
// @ts-ignore
import search = require("N/search");
// @ts-ignore
import {LookupValueObject} from "N/search";

export let pageInit: EntryPoints.Client.pageInit = (context : EntryPoints.Client.pageInitContext) => {
  log.debug('pageInit', JSON.stringify(context));
}