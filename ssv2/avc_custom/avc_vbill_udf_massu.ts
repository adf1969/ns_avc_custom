/**
 * avc_vbill_udf_massu.ts
 *
 * @NScriptName AVC | Vendor Bill:Update Location Field | MU
 * @NScriptType MassUpdateScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Mass Update Script to update Location Field in Vendor Bill Records that don't have a Location set in Expenses
 */

import {EntryPoints} from "N/types";
import MassUpdate = EntryPoints.MassUpdate;
import log = require('N/log');
// @ts-ignore
import search = require("N/search");
// @ts-ignore
import record = require('N/record');

function updateExpenseLocations(context: MassUpdate.eachContext) {
	let stLogTitle = 'updateExpenseLocations';
	log.debug(stLogTitle, 'context = ' + JSON.stringify(context));
}

export = {
	each: updateExpenseLocations
}