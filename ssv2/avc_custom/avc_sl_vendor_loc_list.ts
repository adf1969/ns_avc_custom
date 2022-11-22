/**
 * avc_sl_vendor_loc_list.ts
 *
 * @NScriptName AVC | Vendor Location List | SL
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
import query = require('N/query');
import {Query} from "N/query";

export const onRequest: EntryPoints.Suitelet.onRequest = (ctx) => {
	log.debug('avc_sl_vendor_loc_list:onRequest', 'context: ' + JSON.stringify(ctx));
	let request = ctx.request;
	let response = ctx.response;
	if (request.method == 'GET') {
		let form = serverWidget.createForm({
			title: 'Vendor Location List'
		})

		// @ts-ignore
		let vendorList = getVendorList();
		let vendorList_json = form.addField({
			id: 'custpage_avc_loc_vendorlist_json',
			type: serverWidget.FieldType.LONGTEXT,
			label: 'Vendor List JSON'
		});
		// @ts-ignore
		vendorList_json.defaultValue = JSON.stringify(vendorList);

		// Build List from Vendors
		// @ts-ignore
		let vSubList = createVendorSublist(form, "vsublist", vendorList);

		form.addSubmitButton({
			label: 'Refresh'
		});
		response.writePage(form);

	} else { // POST

	}
};

// INTERFACES
interface ObjSql {
	recordCount: number,
	time: number,
	records: Array<{ [fieldId: string]: string | boolean | number | null }>,
	resultSet?: query.ResultSet
}

// FUNCTIONS

// UI FUNCTIONS

// @ts-ignore
function createVendorSublist(form : serverWidget.Form, sublistName : string, vlist : ObjSql) : serverWidget.Sublist {
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
				type: serverWidget.FieldType.TEXT
			});
		});

		log.debug('createVendorSublist:Loop thru Results and Fill Sublist', `Results: ${rs.results.length}`);
		rs.results.forEach( (result, rIndex) => { // Loop thru Rows
			log.debug('createVendorSublist:sublist.setSublistValue for all Values in Result', JSON.stringify(result));
			result.values.forEach( (value, vIndex) => { // Loop thru Cols/Values in Row
				let col = rs.columns[vIndex];
				let id = 'custpage_' + sublistName + '_' + col.alias;
				//let val = result.values[vIndex]?.toString() ?? ' ';
				//val = val.length == 0 ? ' ' : val;
				let val = value?.toString() ?? ' '; // this MUST be set to at LEAST 1 space, otherwise, it throws an ERROR!
				//let val = ( value === null ) ? '' : value?.toString() ?? '';
				//let val = ( value || '').toString();
				//if (val == null || val === null || typeof val === 'undefined') { val = 'UND' }
				//let val = '';
				// if ( value == null || value === null || typeof value === 'undefined') {
				// 	val = ''
				// } else {
				// 	val = value.toString();
				// }
				log.audit(`createVendorSublist:setSublistValue (id:${id} | v:${vIndex} | r:${rIndex})`, val);
				sublist.setSublistValue({
					id: id,
					line: rIndex,
					value: val
				})
			});

		});
		return sublist;
	} catch (e) {
		log.error('Error creating Vendor sublist - ' + e.name, e.message);
		log.error('Error creating Vendor sublist - ' + e.name + ' stacktrace:', e.stack);
	}
}

// DATABASE FUNCTIONS
function getVendorList(): ObjSql {

	// @ts-ignore
	let qryVendorsList = getResultByQueryId('custdataset_avc_ds_vendorloc');
	let rSet = qryVendorsList.resultSet;
	// Loop thru each result in resultSet.results and Fill as needed
	// NOTE: We MUST pass in the Index since assigning to the passed variable will NOT work, we MUST assign to qryVendorList...
	rSet.results.forEach( (result, indexR) => {
		let values = result.values
		values.forEach( (value, indexV) => {
			if ((value || '').toString().startsWith('[') && (value || '').toString().endsWith(']')) {
				// Token String - fill with function result
				log.debug('getVendorList:value1', `${indexR}|${value}`);
				let newValue = getTokenValue(value);
				//value = "FILLED"; // this will NOT work
				rSet.results[indexR].values[indexV] = newValue;
			}
		})
	});
	// Now that we have updated the ResultSet, we need to update the Mapped object ** NOTE: This does NOT work ** - it leaves
	//  the records with the OLD versions. Not sure if the asMapped() is cached or what.
	let records = qryVendorsList.resultSet.asMappedResults();
	log.debug('getVendorList:rSet.records', JSON.stringify(records));
	qryVendorsList.records = records;

  log.debug('getVendorList:rSet.results', JSON.stringify(rSet.results));

	return qryVendorsList;
} // GETVENDORLIST


// @ts-ignore
function getResultFromQuery(qry: Query) : ObjSql {
	try {
		let beginTime = new Date().getTime();
		let resultSet = qry.run();
		let endTime = new Date().getTime();
		let elapsedTime = endTime - beginTime;

		let results = resultSet.results;
		log.debug('getResultByQueryId:results', JSON.stringify(results));
		let records = resultSet.asMappedResults();
		log.debug('getResultByQueryId:records', JSON.stringify(records));
		log.debug('getResultByQueryId:resultSet', JSON.stringify(resultSet));


		let objSQL = {
			recordCount: records.length,
			time: elapsedTime,
			records: records,
			resultSet: resultSet
		}
		return objSQL;
	} catch (e) {
		return e + e.stack;
	}
}

// @ts-ignore
function getResultByQueryId(qryId: string): ObjSql {
	try {
		let qry = query.load({
			id: qryId
		});

		return getResultFromQuery(qry);
	} catch (e) {
		return e + e.stack;
	}
}

// @ts-ignore
function getResultFromQueryString(qrySql: string): ObjSql {
	try {
		let beginTime = new Date().getTime();
		let qryResults = query.runSuiteQL({
				query: qrySql
			}
		);

		let endTime = new Date().getTime();
		let elapsedTime = endTime - beginTime;

		let results = qryResults.results;
		log.debug('getResultFromQueryString:results', JSON.stringify(results));
		let records = qryResults.asMappedResults();
		log.debug('getResultFromQueryString:records', JSON.stringify(records));

		let objSQL = {
			recordCount: records.length,
			time: elapsedTime,
			records: records
		}
		return objSQL;
	} catch (e) {
		return e + e.stack;
	}
}


// TOKEN FUNCTIONS

function getTokenValue(strToken : any) : any {
	// Ensure strToken is a String
	let str = (strToken || '').toString();

	// Remove the first and last brackets. Tokens look like this: "[function,arg]"
	str = str.slice(1,-1);

	// Get the Function to Call & Args
	let [fName, id] = str.split(',');
	log.debug('getTokenValue:fName,id', `${fName},${id}`);

	let retVal = '';
	switch (fName) {
		case 'getKeyPrincipalText':
			retVal = getKeyPrincipalText(id);
			break;
		case 'getKeyPrincipalAddressText' :
			retVal = getKeyPrincipalAddressText(id);
			break;
		case 'getSignerNamesText' :
			retVal = getSignerNamesText(id);
			break;
		default:
			retVal = 'DEFAULT';
			break;
	}

	log.debug('getTokenValue:retVal', `${retVal}`);
	return retVal;
}

// @ts-ignore
function getKeyPrincipalText(vendId: string) {
	// Format:
	//  1. <Owner-1> (%)
	//    <custrecord_avc_o_eo_name> (if non-blank)
	//  2. <Owner-2> (%)
	//    <custrecord_avc_o_eo_name> (if non-blank)

	let qryId = 'custdataset_avc_ds_vendorloc_owner';
	let qry = query.load({
		id: qryId
	});
	let condition = qry.createCondition({
		fieldId: 'id',
		operator: query.Operator.EQUAL,
		values: vendId
	})
	qry.condition = condition;

	let qryOwners = getResultFromQuery(qry);
	let records = qryOwners.records
	log.debug('getKeyPrincipalText:records', JSON.stringify(records));
	let retArr = new Array();
	let eoNames: string;
	records.forEach((rec, index) => {
		//const displayPercent = (percent: number = <number>rec.custrecord_avc_lo_ownpc) => `${(percent * 100).toFixed(2)}%`;
		let percent = <number>rec.custrecord_avc_lo_ownpc;
		const displayPercent = `${(percent * 100).toFixed(2)}%`;
		//const eoNames = (names:string = <string>rec.custrecord_avc_o_eo_name) => (names || '').toString().length > 0 ? String.fromCharCode(10) + names : '';
		log.debug('getKeyPrincipalText:rec.custrecord_avc_o_eo_name', rec.custrecord_avc_o_eo_name);
		if ((rec.custrecord_avc_o_eo_name || '').toString().length > 0) {
			eoNames = String.fromCharCode(10) + rec.custrecord_avc_o_eo_name;
		} else {
			eoNames = '';
		}
		retArr.push(`${index+1}. ${rec.name} (${displayPercent})${eoNames}`);
	});
	let retVal = retArr.join(String.fromCharCode(10));
	log.debug('getKeyPrincipalText:retVal', retVal);
	return retVal;
	//return `filled-gKPT:${vendId}`
}

// @ts-ignore
function getKeyPrincipalAddressText(vendId: string) {
	//  1. <Owner-1> (%)
	//    <custrecord_avc_o_eo_addr> (if non-blank)
	//  2. <Owner-2> (%)
	//    <custrecord_avc_o_eo_addr> (if non-blank)
	// Format:

	let qryId = 'custdataset_avc_ds_vendorloc_owner';
	let qry = query.load({
		id: qryId
	});
	let condition = qry.createCondition({
		fieldId: 'id',
		operator: query.Operator.EQUAL,
		values: vendId
	})
	qry.condition = condition;

	let qryOwners = getResultFromQuery(qry);
	let records = qryOwners.records
	log.debug('getKeyPrincipalAddressText:records', JSON.stringify(records));
	let retArr = new Array();
	let eoAddrs: string;
	records.forEach((rec, index) => {
		//const displayPercent = (percent: number = <number>rec.custrecord_avc_lo_ownpc) => `${(percent * 100).toFixed(2)}%`;
		log.debug('getKeyPrincipalAddressText:rec.custrecord_avc_o_eo_name', rec.custrecord_avc_o_eo_name);
		if ((rec.custrecord_avc_o_eo_addr || '').toString().length > 0) {
			eoAddrs = String.fromCharCode(10) + rec.custrecord_avc_o_eo_addr;
		} else {
			eoAddrs = '';
		}
		retArr.push(`${index+1}. ${rec.paddr}${eoAddrs}`);
	});
	let retVal = retArr.join(String.fromCharCode(10));
	log.debug('getKeyPrincipalAddressText:retVal', retVal);
	return retVal;
	//return `filled-gKPAT:${vendId}`
}

// @ts-ignore
function getSignerNamesText(vendId: string) {
	// Format:
	//  <signer1>
	//  <signer2>...
	const qryId = 'custdataset_avc_ds_vendorloc_signer';
	let qry = query.load({
		id: qryId
	});
	let condition = qry.createCondition({
		fieldId: 'id',
		operator: query.Operator.EQUAL,
		values: vendId
	})
	qry.condition = condition;

	let qrySigners = getResultFromQuery(qry);
	let records = qrySigners.records
	log.debug('getSignerNamesText:records', JSON.stringify(records));
	let retArr = new Array();
	records.forEach((rec) => {
		retArr.push(rec.name);
	});
	let retVal = retArr.join(String.fromCharCode(10));
	return retVal;
	//return `filled-gSNT:${vendId}`
}