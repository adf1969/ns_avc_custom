/**
 * avc_accountbalrpt_main_sl.ts
 *
 * @NScriptName AVC | Account Balance Report | SL
 * @NScriptType Suitelet
 * @NApiVersion 2.1
 *
 * Purpose: Provide a form to list Note Balances and compare to Ending Balance Records to correct posting errors - Suitelet
 *
 */

import {EntryPoints} from 'N/types';
import log = require('N/log');
// @ts-ignore
import record = require('N/record');
import serverWidget = require('N/ui/serverWidget');
// @ts-ignore
import query = require('N/query');

import {search} from "N";
//import runtime = require('N/runtime');
//import redirect = require('N/redirect');
// @ts-ignore
import * as avm from "./avc_sl_util";
import onRequest = EntryPoints.Suitelet.onRequest;
import onRequestContext = EntryPoints.Suitelet.onRequestContext;
import * as ui from "N/ui/serverWidget";
//import {dateToYMD, dateToYMDHms, getFolderIdFromPath} from "./avc_vendloclist_main_util";

// @ts-ignore
let gFilterFormId = 'custpage_avc_accountbalrpt';
let gSublistName = 'avc_abrpt';

export const onRequest: EntryPoints.Suitelet.onRequest = (ctx) => {
	log.debug('avc_sl_vendor_loc_list:onRequest', 'context: ' + JSON.stringify(ctx));
	let request = ctx.request;
	//let response = ctx.response;
	if (request.method == 'GET') {
		let requestMode = (request.parameters.avc_custom_mode || '');
		switch (requestMode) {
			case 'RequestModeCode':
				//onRequestGet_UpdateCSVFiles(ctx);
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

	//let request = ctx.request;
	let response = ctx.response;

	let form = serverWidget.createForm({
		title: 'Account Balance Report Main'
	});
	//form.clientScriptModulePath = './avc_accountbalrpt_main_cs.js';

	// Create the filterForm
	const filterForm = createFilterForm(form);

	response.writePage(form);
}

function onRequestPost(ctx: onRequestContext) {
	let stLogTitle = "onRequestPost";
	log.debug(`${stLogTitle}:ctx (onRequestContext)`, JSON.stringify(ctx));
	let request = ctx.request;
	let response = ctx.response;
	log.debug(`${stLogTitle}:ctx.response)`, JSON.stringify(response));

	// Retrieve the values of the fields from the form submission
	const accountType = request.parameters[`${gFilterFormId}_accounttype`];
	const dateOnOrBefore = request.parameters[`${gFilterFormId}_date`];

	let form = serverWidget.createForm({
		title: 'Account Balance Report Main'
	});

	// @ts-ignore
	const filterForm = createFilterForm(form);
	filterForm.updateDefaultValues({
		[`${gFilterFormId}_accounttype`] : accountType,
		[`${gFilterFormId}_date`] : dateOnOrBefore
	});

	// Create a search to retrieve the accounts based on the filter criteria
	const accountSearch = avm.createAccountSearch(accountType, dateOnOrBefore);
	log.debug(`${stLogTitle}:accountSearch`, JSON.stringify(accountSearch));



	// TEST-BEGIN Getting Data from DataSet ---------------
	// Various FieldIds for Conditions:
	// isinactive: 'accountingimpact.account.isinactive'
	// accttype: 'accountingimpact.account.accttype'
	// trandate: 'trandate' (this is on the actual Transaction, so no Join is necessary)
	//
	let qry = query.create({
			type: query.Type.TRANSACTION
	});
	// let qryConditionActive = qry.createCondition({
	// 	fieldId: 'isinactive',
	// 	operator: query.Operator.IS,
	// 	values: [false,]
	// });
	//TODO: Try and see if maybe I can get the component from the query.columns[] array, and if it matches
	// add my Condition to THAT and see if that works
	// let qryConditionAT = qry.createCondition({
	// 	//fieldId: 'transaction.transactionlines.accountingimpact.account.accttype',
	// 	fieldId: 'transactionlines.accountingimpact.account.accttype',
	// 	operator: query.Operator.ANY_OF,
	// 	values: [accountType]
	// });

	// let qryConditionDt = qry.createCondition({
	// 	fieldId: 'trandate',
	// 	operator: query.Operator.ON_OR_BEFORE,
	// 	values: [dateOnOrBefore]
	// });
	// let qryCondition = qry.and(
	// 	//qryConditionActive,
	// 	qryConditionAT,
	// 	//qryConditionDt
	// );

	// let acctBalList = avm.getAccountBalRptList(true, qryConditionAT);
	// log.debug(`${stLogTitle}:acctBalList`, JSON.stringify(acctBalList));

	// New Test, with creating the RptList 100% from Code/ChatGPT
	let acctBalList = avm.getAcctBalQueryResultSet({
		accttype: accountType,
		isinactive: false,
		trandateOnOrBefore: dateOnOrBefore
	});
	//let acctBalList = avm.getAcctBalQueryResultSet();
	log.debug(`${stLogTitle}:acctBalList`, JSON.stringify(acctBalList));



	// TEST-END Getting Data from DataSet ---------------



	// Run the search and display the results in a sublist on the form
	const sublistName = gSublistName;

	const searchResults = accountSearch.run();
	log.debug(`${stLogTitle}:searchResults`, JSON.stringify(searchResults));

	fillAccountSublist(form, searchResults, sublistName);

	response.writePage(form);
}

export function createFilterForm(form: ui.Form): ui.Form {
	let stLogTitle = "createFilterForm";
	// @ts-ignore
	const accountTypeField = form.addField({
		id: `${gFilterFormId}_accounttype`,
		type: ui.FieldType.SELECT,
		label: 'Account Type',
		source: 'accounttype',
	});
	accountTypeField.addSelectOption({
		value: '',
		text: ''
	});

	const accountTypes = avm.getAccountTypes();
	log.debug(`${stLogTitle}:accountTypes`, JSON.stringify(accountTypes));

	accountTypes.forEach((accountType) => {
		accountTypeField.addSelectOption({
			value: accountType.value,
			text: accountType.text,
		});
	});

	// @ts-ignore
	const dateField = form.addField({
		id: `${gFilterFormId}_date`,
		type: ui.FieldType.DATE,
		label: 'Date',
	});

	// Add a submit button to the form
	form.addSubmitButton({
		label: 'Filter',
	});

	return form;
}

// @ts-ignore
export function createSublist(form: ui.Form, sublistname: string): ui.Sublist {
	let stLogTitle = "createSublist";
	log.debug(`${stLogTitle}:form`, JSON.stringify(form));

	const sublist = form.addSublist({
		id: `custpage_${sublistname}`,
		type: ui.SublistType.LIST,
		label: 'Accounts',
	});

	sublist.addMarkAllButtons();

	sublist.addField({
		id: `custpage_${sublistname}_name`,
		type: ui.FieldType.TEXT,
		label: 'Account Name',
	});

	sublist.addField({
		id: `custpage_${sublistname}_type`,
		type: ui.FieldType.TEXT,
		label: 'Account Type',
	});

	sublist.addField({
		id: `custpage_${sublistname}_accountnumber`,
		type: ui.FieldType.TEXT,
		label: 'Account Number',
	});

	sublist.addField({
		id: `custpage_${sublistname}_currency`,
		type: ui.FieldType.TEXT,
		label: 'Currency',
	});

	sublist.addField({
		id: `custpage_${sublistname}_balance`,
		type: ui.FieldType.TEXT,
		label: 'Balance',
	});

	return sublist;
}

export function fillAccountSublist(form: serverWidget.Form, results : search.ResultSet, sublistname: string) {
	let stLogTitle = "fillAccountSublist";
	log.debug(`${stLogTitle}:form`, JSON.stringify(form));
	log.debug(`${stLogTitle}:results`, JSON.stringify(results));

	const sublist = createSublist(form, sublistname);

	let i = 0;
	results.each(function (result) {
		//log.debug(`${stLogTitle}:result (${i}):`, result);
		sublist.setSublistValue({
			id: `custpage_${sublistname}_name`,
			line: i,
			value: result.getValue({ name: 'name' }).toString() ?? ' ', // this MUST be set to at LEAST 1 space, otherwise, it throws an ERROR!
		});

		sublist.setSublistValue({
			id: `custpage_${sublistname}_type`,
			line: i,
			value: result.getValue({ name: 'type' }).toString() ?? ' ',
		});

		sublist.setSublistValue({
			id: `custpage_${sublistname}_number`,
			line: i,
			value: result.getValue({ name: 'number' }).toString() ?? ' ',
		});

		// sublist.setSublistValue({
		// 	id: `custpage_${sublistname}_currency`,
		// 	line: i,
		// 	value: result.getText({ name: 'currency' }).toString() ?? ' ',
		// });

		// This does NOT work.
		// sublist.setSublistValue({
		// 	id: `custpage_${sublistname}_balance`,
		// 	line: i,
		// 	value: result.getValue({ name: 'formulabalance' }).toString() ?? ' ',
		// });

		i++;
		return true;
	});

}



