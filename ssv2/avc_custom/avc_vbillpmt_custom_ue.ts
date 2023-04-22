/**
 * avc_vbillpmt_custom_ue.ts
 *
 * @NScriptName AVC | Vendor Bill Pmt Custom | UE
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 *
 * File Version: 1.0-2021-12-21-17:42:29
 * Purpose: Purpose: AVC Customizations to Vendor Bill Payment Form - User Event Script
 *
 * Add code to add the Cleared status to Checks and Bill Payment View Screens
 *
 */

import {EntryPoints} from "N/types";
import log = require('N/log');
//@ts-ignore
import search = require("N/search");
//@ts-ignore
import serverWidget = require('N/ui/serverWidget');
//import record = require('N/record');
// @ts-ignore
import * as avc from "./avc_util";


export function beforeLoad(context: EntryPoints.UserEvent.beforeLoadContext) {
	let stLogTitle = 'beforeLoad';
	// Only run in Create/Edit/Copy/View Modes
	// if ([context.UserEventType.CREATE, context.UserEventType.COPY,
	// 	context.UserEventType.EDIT, context.UserEventType.VIEW].includes(context.type)) {
	// 	log.debug(stLogTitle, context.type);
	//
	// }

	// Only run in View Mode
	if ([context.UserEventType.VIEW].includes(context.type)) {
		log.debug(stLogTitle, context.type);
		let form = context.form;
		log.debug(stLogTitle + ':context.form', JSON.stringify(form));
		let rec = context.newRecord
		//log.debug(stLogTitle + ':context.newRecord', JSON.stringify(rec));

		// @ts-ignore
		let newFld = avc.addClearedDisplayField(form, rec);

	}

}