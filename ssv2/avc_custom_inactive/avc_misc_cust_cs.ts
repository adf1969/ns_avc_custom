/**
 * avc_misc_custom_cs.ts
 *
 * @NScriptName AVC Misc Custom Client Script, This is a Testing Script for testing Client Scripts
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 */

/** NOT USED */

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