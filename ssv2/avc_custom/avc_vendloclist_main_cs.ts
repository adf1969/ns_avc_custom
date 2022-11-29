/**
 * avc_vendloclist_main_cs.ts
 *
 * @NScriptName AVC | Vendor Location List Main | CS
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 * Purpose: Provide Client Script Hooks for Vendor Loc App - Client Script
 *
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
import message = require('N/ui/message');

// @ts-ignore
import * as avm from "./avc_vendloclist_main_util";
// @ts-ignore
import {currentRecord, url} from "N";


export let pageInit: EntryPoints.Client.pageInit = (context : EntryPoints.Client.pageInitContext) => {
	//log.debug('pageInit', JSON.stringify(context));
}

export function callSL_UpdateCSVFiles() {
	// Function to call SuiteLet
	try {
		let stLogTitle = 'callSL_UpdateCSVFiles';
		log.debug(stLogTitle, stLogTitle);
		//let currRec= currentRecord.get();
		//let tranId = currRec.id;
		const formId = 'custpage_avc_loc_vendorlist';
		const exportNameId = `${formId}_export_name`;

		let currRec = currentRecord.get();
		log.debug(stLogTitle, `currRec = ` + JSON.stringify(currRec));
		let exportName = currRec.getValue( { fieldId: exportNameId}).valueOf();

		let suiteletURL= url.resolveScript({
			scriptId: 'customscript_avc_vendloclist_main_sl',
			deploymentId: 'customdeploy_avc_vendloclist_main_sl',
			returnExternalUrl: false,
			params: {
				avc_custom_mode: 'UpdateCSVFiles',
				avc_export_name: exportName
			}
		});
		//var response = https.post({
		//   url: suiteletURL,
		//   body: {
		//       tranId: tranId
		//   }
		// });

		window.open(suiteletURL);

		let successMessage = message.create({
			title: 'Success',
			message: 'CSV Files Updated',
			type: message.Type.CONFIRMATION
		});

		successMessage.show();

	}
	catch (error) {
		let failMessage = message.create({
			title: 'Error',
			message: 'CSV Files not updated. Error: ' + error,
			type: message.Type.ERROR
		});

		failMessage.show();
		log.error('Error Found', error);
	}
}