/**
 * avc_vendloclist_main_sl.ts
 *
 * @NScriptName AVC | Vendor Location List Main | SL
 * @NScriptType Suitelet
 * @NApiVersion 2.1
 *
 * Purpose: Provide a form to filter/export CSV data for Bank Accounts - Suitelet
 *
 */

import {EntryPoints} from 'N/types';
import log = require('N/log');
// @ts-ignore
import record = require('N/record');
import serverWidget = require('N/ui/serverWidget');
// @ts-ignore
import query = require('N/query');
// @ts-ignore
import {Query} from "N/query";
import runtime = require('N/runtime');
import redirect = require('N/redirect');
// TODO: Migrate from using avc_vendloclist_main_util to using avc_sl_util
// @ts-ignore
import * as avm from "./avc_vendloclist_main_util";
import onRequest = EntryPoints.Suitelet.onRequest;
import onRequestContext = EntryPoints.Suitelet.onRequestContext;
import {dateToYMD, dateToYMDHms, getFolderIdFromPath} from "./avc_vendloclist_main_util";

// DOES NOT WORK SINCE NetSuite doesn't have Intl!
// Usage:
//  console.log(formatterCurrency.format(2500)); /* $2,500.00 */
// @ts-ignore
// const formatterCurrency = new Intl.NumberFormat('en-US', {
// 	style: 'currency',
// 	currency: 'USD',
// 	// These options are needed to round to whole numbers if that's what you want.
// 	//minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
// 	//maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
// });

export const onRequest: EntryPoints.Suitelet.onRequest = (ctx) => {
	log.debug('avc_sl_vendor_loc_list:onRequest', 'context: ' + JSON.stringify(ctx));
	let request = ctx.request;
	//let response = ctx.response;
	if (request.method == 'GET') {
		let requestMode = (request.parameters.avc_custom_mode || '');
		switch (requestMode) {
			case 'UpdateCSVFiles':
				onRequestGet_UpdateCSVFiles(ctx);
				break;
			default:
				onRequestGet(ctx);
				break;
		}
	} else { // POST
		onRequestPost(ctx);
	}
};

// onRequest: FUNCTIONS

function onRequestGet(ctx: onRequestContext) {
	var stLogTitle = "onRequestGet";
	log.debug(stLogTitle, 'context: ' + JSON.stringify(ctx));
	const formId = 'custpage_avc_loc_vendorlist';

	//let request = ctx.request;
	let response = ctx.response;

	let form = serverWidget.createForm({
		title: 'Vendor Location List Main'
	});
	form.clientScriptModulePath = './avc_vendloclist_main_cs.js';

	// @ts-ignore
	let vendorList = avm.getVendorList(true);

	// Main Group
	let mainGroupId = 'custpage_avc_maingroup';
	// @ts-ignore
	let mainGroup = form.addFieldGroup({
		id: mainGroupId,
		label: 'Main'
	});

	// Add the Export Name Field
	let vendorList_exportName = form.addField( {
		id: `${formId}_export_name`,
		type: serverWidget.FieldType.TEXT,
		label: 'Export Set Name',
		container: mainGroupId
	});
	vendorList_exportName.defaultValue = '';

	// Get Destination Folder ID
	let dateStrY = dateToYMD(new Date(), '').substr(0,4);
	let rootFolderPath = 'SuiteApps\\avc.vendorloclist';
	rootFolderPath += '\\' + dateStrY;
	let rootFolderId = 	getFolderIdFromPath(rootFolderPath);
	log.debug(stLogTitle, 'rootFolderId: ' + rootFolderId);
	let folderLabel = "SA\\avc.vendorloclist\\" + dateStrY;
	let folderId = 'custpage_avc_urlfolderlink_root';
	let folderHtml = avm.buildFolderLink(rootFolderId, folderLabel, `File Cabinet Root Folder:`, folderId);
	let folderLink = form.addField({
		id: folderId,
		type: serverWidget.FieldType.INLINEHTML,
		label: `${folderLabel}:`,
		container: mainGroupId
	});
	folderLink.defaultValue = folderHtml;

	// FOR TESTING ---
	/*
	let vendorList_json = form.addField({
		id: `${formId}_json`,
		type: serverWidget.FieldType.LONGTEXT,
		label: 'Vendor List JSON'
	});
	// @ts-ignore
	vendorList_json.defaultValue = JSON.stringify(vendorList);
	 */


	// Build List from Vendors
	// @ts-ignore
	let vSubList = createVendorSublist(form, "vsublist", vendorList);

	// form.addSubmitButton({
	// 	label: 'Create CSV Files'
	// });
	// form.addSubmitButton({
	// 	label: 'Refresh List'
	// });

	response.writePage(form);

}

function onRequestGet_UpdateCSVFiles(ctx: onRequestContext) {
	// @ts-ignore
	let stLogTitle = "onRequestGet_UpdateCSVFiles";
	log.debug(stLogTitle, 'context: ' + JSON.stringify(ctx));
	const now = new Date();

	//let request = ctx.request;
	let response = ctx.response;
	let request = ctx.request;

	// Get Parameters
	let exportName = (request.parameters.avc_export_name || '');
	exportName = (typeof exportName !== 'undefined' && exportName.length > 0) ? exportName : dateToYMDHms(now).substr(0,19);

	let form = serverWidget.createForm({
		title: 'Vendor Location Update CSV Files'
	});
	form.addSubmitButton({
		label: 'Submit'
	});

	// --- Create/Update CSV Files ---

	let folderGroupId = 'custpage_avc_foldergroup';
	// @ts-ignore
	let folderGroup = form.addFieldGroup({
		id: folderGroupId,
		label: 'CSV Folder'
	});

	// Get Destination Folder ID
	let destFolderId = avm.getDestFolderId(exportName);
	log.debug(stLogTitle, 'destFolderId: ' + destFolderId);
	let folderLabel = exportName;
	let folderId = 'custpage_avc_urlfolderlink_csvname';
	let folderHtml = avm.buildFolderLink(destFolderId, folderLabel, `${folderLabel} Folder:`, folderId);
	let folderLink = form.addField({
		id: folderId,
		type: serverWidget.FieldType.INLINEHTML,
		label: `${folderLabel}:`,
		container: folderGroupId
	});
	folderLink.defaultValue = folderHtml;


	// File Group
	let fileGroupId = 'custpage_avc_filegroup';
	// @ts-ignore
	let fileGroup = form.addFieldGroup({
		id: fileGroupId,
		label: 'CSV Files'
	});
	fileGroup.isSingleColumn = true;

	// Create BCD-Account List CSV File -------------
	// @ts-ignore
	let alFile = avm.createBcdAccountList_CSVFile(destFolderId);
	let alFieldLabel = 'BCD-Account List File';
	let alFieldId = 'custpage_avc_urlfilelink_bcd_accountlist';
	let alFileHtml = avm.buildFileLink(alFile, alFieldLabel, alFieldId);
	let alFileLink = form.addField({
		id: alFieldId,
		type: serverWidget.FieldType.INLINEHTML,
		label: `${alFieldLabel}:`,
		container: fileGroupId
	});
	alFileLink.defaultValue = alFileHtml;


	// Create BCD-Owner List CSV File ---------------
	let olFile = avm.createBcdOwnerList_CSVFile(destFolderId);
	let olFieldLabel = 'BCD-Owner List File';
	let olFieldId = 'custpage_avc_urlfilelink_bcd_ownerlist';
	let olFileHtml = avm.buildFileLink(olFile, olFieldLabel, olFieldId);
	let olFileLink = form.addField({
		id: olFieldId,
		type: serverWidget.FieldType.INLINEHTML,
		label: `${olFieldLabel}:`,
		container: fileGroupId
	});
	olFileLink.defaultValue = olFileHtml;


	// Create BCD-Signer List CSV File --------------
	let slFile = avm.createBcdSignerList_CSVFile(destFolderId);
	let slFieldLabel = 'BCD-Signer List File';
	let slFieldId = 'custpage_avc_urlfilelink_bcd_signerlist';
	let slFileHtml = avm.buildFileLink(slFile, slFieldLabel, slFieldId);
	let slFileLink = form.addField({
		id: slFieldId,
		type: serverWidget.FieldType.INLINEHTML,
		label: `${slFieldLabel}:`,
		container: fileGroupId
	});
	slFileLink.defaultValue = slFileHtml;


	response.writePage(form);
}

function onRequestPost(ctx: onRequestContext) {
	//let request = ctx.request;
	//let response = ctx.response;

	// This redirects the POST back to the original SuiteLet page
	let cs = runtime.getCurrentScript();
	redirect.toSuitelet({
		scriptId: cs.id,
		deploymentId: cs.deploymentId,
		parameters: {
			'custparam_test': 'test'
		}
	});

}

// UI FUNCTIONS

// @ts-ignore
function createVendorSublist(form : serverWidget.Form, sublistName : string, vlist : avm.ObjSql) : serverWidget.Sublist {
	try {
		log.debug('createVendorSublist:sublistName', sublistName);
		let sublistTitle = "Vendor Location List";
		let sublist = form.addSublist({
			id: 'custpage_' + sublistName,
			type: serverWidget.SublistType.LIST,
			label: sublistTitle
		});
		let rs = vlist.resultSet;

		// Create the sublist from the Columns
		log.debug('createVendorSublist:Build Sublist', `Columns: ${rs.columns.length}`);
		rs.columns.forEach( (col, cIndex) => {
			log.audit('createVendorSublist:sublist.addField:col', JSON.stringify(col));
			sublist.addField({
				id: 'custpage_' + sublistName + '_' + col.alias,
				label: col.label,
				type: serverWidget.FieldType.TEXTAREA
			});
		});

		log.debug('createVendorSublist:Loop thru Results and Fill Sublist', `Results: ${rs.results.length}`);
		rs.results.forEach( (result, rIndex) => { // Loop thru Rows
			log.debug('createVendorSublist:sublist.setSublistValue for all Values in Result', JSON.stringify(result));
			result.values.forEach( (value, vIndex) => { // Loop thru Cols/Values in Row
				let col = rs.columns[vIndex];
				let id = 'custpage_' + sublistName + '_' + col.alias;
				let val = value?.toString() ?? ' '; // this MUST be set to at LEAST 1 space, otherwise, it throws an ERROR!
				//log.audit(`createVendorSublist:setSublistValue (id:${id} | v:${vIndex} | r:${rIndex})`, val);
				sublist.setSublistValue({
					id: id,
					line: rIndex,
					value: val
				})
			});
		});

		// Add Button to Sublist
		sublist.addButton({
			id: 'custpage_' + sublistName + '_btn_dl_vlist',
			label: 'Update/Create CSV Files',
			functionName: 'callSL_UpdateCSVFiles'
		});

		sublist.addRefreshButton();

		return sublist;
	} catch (e) {
		log.error('Error creating Vendor sublist - ' + e.name, e.message);
		log.error('Error creating Vendor sublist - ' + e.name + ' stacktrace:', e.stack);
	}
}

