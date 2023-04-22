/**
 * avc_deposit_udf_massu.ts
 *
 * @NScriptName AVC | Deposit:Update Location Field | MU
 * @NScriptType MassUpdateScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Mass Update Script to update Location Field in Deposit Records that don't have a Location set in Expenses
 */

import {EntryPoints} from "N/types";
import MassUpdate = EntryPoints.MassUpdate;
import log = require('N/log');
// @ts-ignore
import search = require("N/search");
// @ts-ignore
import record = require('N/record');
import {Type} from "N/record";
import {url} from 'N';

let NS_DEPOSIT_OTHER_SUBLIST_ID = 'other';
function updateDepositLocations(context: MassUpdate.eachContext) {
	let bUpdateRec:boolean = false;
	let stLogTitle = 'updateDepositLocations';
	log.debug(`${stLogTitle}: context`, JSON.stringify(context));

	// Load the Deposit Record
	let dRec = record.load({
		type: context.type,
		id: context.id
	});
	let depId = context.id;
	stLogTitle = `${stLogTitle} (${depId})`;
	//@ts-ignore
	const sDepositUrl = url.resolveRecord({
		recordType: Type.DEPOSIT,
		recordId: depId,
		isEditMode: false
	});
	// @ts-ignore
	const sDepositHref = `<a target="_blank" href="${sDepositUrl}">Deposit ID ${depId}</a>`

	// Get the Location off the Main Record
	let mainLocation = dRec.getValue('location');

	// If no Main Location, exit
	if (!mainLocation) {
		log.error(`${stLogTitle}: No Main Location set Exiting`, `${sDepositUrl}`);
		return;
	}
	log.debug(`${stLogTitle}: Main Location:`, mainLocation);

	// Get count of line-items
	let lineCount = dRec.getLineCount({sublistId: NS_DEPOSIT_OTHER_SUBLIST_ID});
	log.debug(`${stLogTitle}: lineCount:`, lineCount);

	// Loop thru each line item and update
	for (let iLine=0; iLine < lineCount; iLine++) {
		let lineLoc = dRec.getSublistValue({
			sublistId: NS_DEPOSIT_OTHER_SUBLIST_ID,
			fieldId: 'location',
			line: iLine
		});
		log.debug(`${stLogTitle}: Line ${iLine}.location:`, lineLoc);
		if (!lineLoc) {
			log.debug(`${stLogTitle}: Line ${iLine} Set location:`, mainLocation);
			bUpdateRec = true;
			dRec.setSublistValue({
				sublistId: NS_DEPOSIT_OTHER_SUBLIST_ID,
				fieldId: 'location',
				line: iLine,
				value: mainLocation
			});
		}
	}
	// If we need to update the record, Save it.
	if (bUpdateRec) {
		// Save the Record
		log.debug(`${stLogTitle}: Save Record with DepositID:`, depId);
		dRec.save();
	}
}

export = {
	each: updateDepositLocations
}

/*
Test Mass Update Document Numbers
* 2178: Deposit with NO Main Location and Set Sub-Locations
* 299: Deposit with Main Location Set and Blank Sub-Locations
* 2184: Deposit with Main Location Set and Sub-Locations Set
*/