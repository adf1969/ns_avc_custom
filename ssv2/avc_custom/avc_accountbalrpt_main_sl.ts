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

import {search} from "N";
//import runtime = require('N/runtime');
//import redirect = require('N/redirect');
// @ts-ignore
import * as avm from "./avc_sl_util";
import {createAcctBalQuery, EnhLogOptions, ReturnType, elog} from "./avc_sl_util";
import * as ui from "N/ui/serverWidget";
import {ServerRequest} from "N/http";
import log = require('N/log');
// @ts-ignore
import record = require('N/record');
import serverWidget = require('N/ui/serverWidget');
// @ts-ignore
import query = require('N/query');
import onRequestContext = EntryPoints.Suitelet.onRequestContext;
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
	elog.addFunctions(["!processTran"]);
	elog.addTags(["!Url", "!column"]);
	elog.addFunctions(["force"]);

	let eOpt : EnhLogOptions = {
		function: 'onRequestPost',
		tags: ['Request', 'Post'],
	};
	elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.

	elog.debug(`ctx (onRequestContext)`, JSON.stringify(ctx), eOpt);
	let request = ctx.request;
	let response = ctx.response;
	elog.debug(`ctx.response)`, JSON.stringify(response), eOpt);

	// Retrieve the values of the fields from the form submission
	const accountType = request.parameters[`${gFilterFormId}_accounttype`];
	const dateOnOrBefore = request.parameters[`${gFilterFormId}_date`];
	const accountName = request.parameters[`${gFilterFormId}_accountname`];

	let form = serverWidget.createForm({
		title: 'Account Balance Report Main'
	});

	// @ts-ignore
	const filterForm = createFilterForm(form);
	filterForm.updateDefaultValues({
		[`${gFilterFormId}_accounttype`] : accountType,
		[`${gFilterFormId}_date`] : dateOnOrBefore,
		[`${gFilterFormId}_accountname`] : accountName
	});

	// Create a search to retrieve the accounts based on the filter criteria
	// const accountSearch = avm.createAccountSearch(accountType, dateOnOrBefore);
	// elog.debug(`accountSearch`, JSON.stringify(accountSearch), eOpt);


	// TEST-BEGIN Getting Data from DataSet ---------------
	// Various FieldIds for Conditions:
	// isinactive: 'accountingimpact.account.isinactive'
	// accttype: 'accountingimpact.account.accttype'
	// trandate: 'trandate' (this is on the actual Transaction, so no Join is necessary)
	//
	//TODO: Try and see if maybe I can get the component from the query.columns[] array, and if it matches
	// add my Condition to THAT and see if that works
	// let qryConditionAT = qry.createCondition({
	// 	//fieldId: 'transaction.transactionlines.accountingimpact.account.accttype',
	// 	fieldId: 'transactionlines.accountingimpact.account.accttype',
	// 	operator: query.Operator.ANY_OF,
	// 	values: [accountType]
	// });

	// let tranAcctBalList = avm.getAccountBalRptList(true, qryConditionAT);
	// log.debug(`${stLogTitle}:tranAcctBalList`, JSON.stringify(tranAcctBalList));

	// New Test, with creating the RptList 100% from Code/ChatGPT

/*
	// Add the AccountIds returned to the request.parameters array so they can be used in retrieving Ending Balance values
	const accountIds = tranAcctInternalBalList.records.map(record => record['account.id']).join(',');
	request.parameters[`${gFilterFormId}_accountIds`] = accountIds;
	elog.debug(`accountIds`, accountIds, eOpt);
	const tranAcctEndingBalList = getTranAcctEndingBalResults(request);

	const tranAcctBalList = combineTranAcctList(tranAcctInternalBalList, tranAcctEndingBalList);
	//const tranAcctBalList = tranAcctInternalBalList;
	//elog.debug(`tranAcctBalList.columns`, JSON.stringify(tranAcctBalList.columns), eOpt);

	// updateTranAcctBalResults(tranAcctBalList, request.parameters);
	// elog.debug(`tranAcctBalList.columns`,tranAcctBalList.columns, eOpt)
	// elog.debug(`tranAcctBalList.records`,tranAcctBalList.records, eOpt)
 */


	let tranAcctBalList_Processed = getTranAcctList(request);

	// Create the Sublist Form from the processed values
	let vSubList = createAcctBalSublist(form, "acctbal_sublist", tranAcctBalList_Processed);

	// TEST-END Getting Data from DataSet ---------------



	// TEST SuiteQL - BEGIN

	//const sqlResult = test_executeSuiteQL();
	// elog.debug("sqlResult", sqlResult, eOpt);
	// let sqlRecords = sqlResult.asMappedResults();
	// elog.debug("sqlRecords", sqlRecords, eOpt);

	// TEST SuiteQL - END


	// Run the search and display the results in a sublist on the form
	/*
	const sublistName = gSublistName;

	const searchResults = accountSearch.run();
	log.debug(`${stLogTitle}:searchResults`, JSON.stringify(searchResults));

	fillAccountSublist(form, searchResults, sublistName);
	*/

	response.writePage(form);
}

function getTranAcctList(request: ServerRequest) : avm.ObjSql {
	let eOpt : EnhLogOptions = {
		function: 'getTranAcctList',
		tags: ['TranAcct'],
	};
	elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.

	const tranAcctInternalBalList = getTranAcctInternalBalResults(request);
	elog.debug("tranAcctInternalBalList:BEFORE", tranAcctInternalBalList, eOpt);
	updateTranAcctBalResults(tranAcctInternalBalList, request.parameters);
	elog.debug("tranAcctInternalBalList:AFTER", tranAcctInternalBalList, eOpt);

	const tranAcctBalList_Processed = avm.processTranList(tranAcctInternalBalList, true);
	//log.debug(`${stLogTitle}:tranAcctBalList_Processed.columns`, JSON.stringify(tranAcctBalList_Processed.columns));
	elog.debug(`tranAcctBalList_Processed.columns`,tranAcctBalList_Processed.columns, eOpt)
	elog.debug(`tranAcctBalList_Processed.records`,tranAcctBalList_Processed.records, eOpt)

	return tranAcctBalList_Processed;
}


// TEST of SuiteQL
function test_executeSuiteQL() : query.ResultSet {
	let eOpt : EnhLogOptions = {
		function: 'test_executeSuiteQL',
		tags: ['SuiteQL'],
	};
	elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.

	const suiteQL = `
        WITH ranked_transactions AS (
            SELECT 
                TRANSACTION.ID as TransactionId, 
                Subsidiary.name as SubsidiaryName, 
                ACCOUNT.id as AccountId, 
                TRANSACTION.trandate as TranDate, 
                transactionLine.custcol_avc_ending_bal as EndingBalance,
                ROW_NUMBER() OVER(PARTITION BY Subsidiary, Account ORDER BY Date DESC) as rn
            FROM 
                TRANSACTION,
                Subsidiary,
                ACCOUNT,
                TransactionAccountingLine,
                transactionLine
            WHERE                 
								(((
									(transactionLine.subsidiary = Subsidiary.ID(+) AND TransactionAccountingLine.ACCOUNT = ACCOUNT.ID(+))
								 	AND (transactionLine.TRANSACTION = TransactionAccountingLine.TRANSACTION AND transactionLine.ID = TransactionAccountingLine.transactionline)
								 	) 
								 	AND TRANSACTION.ID = transactionLine.TRANSACTION
								 )
								)								 
   							 AND NVL(ACCOUNT.isinactive, 'F') = ?    							 
   							 AND UPPER(ACCOUNT.accountsearchdisplaynamecopy) LIKE ?
   							 AND TRANSACTION.trandate <= TO_TIMESTAMP(?, 'YYYY-MM-DD HH24:MI:SS') 
   							 AND ACCOUNT.accttype IN ('LongTermLiab') 
   							 AND transactionLine.custcol_avc_ending_bal IS NOT NULL 
   							 
        )
        SELECT 
            TransactionId, 
            SubsidiaryName, 
            AccountId, 
            TranDate, 
            EndingBalance
        FROM 
            ranked_transactions
        WHERE 
            rn = 1
    `;

	const suiteQL2 = `
SELECT 
  BUILTIN_RESULT.TYPE_INTEGER(TRANSACTION.ID) AS ID, 
  BUILTIN_RESULT.TYPE_STRING(TRANSACTION.trandisplayname) AS trandisplayname, 
  BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(transactionLine.subsidiary)) AS subsidiary, 
  BUILTIN_RESULT.TYPE_STRING(Subsidiary.name) AS name, 
  BUILTIN_RESULT.TYPE_INTEGER(ACCOUNT.ID) AS id_1, 
  BUILTIN_RESULT.TYPE_BOOLEAN(ACCOUNT.isinactive) AS isinactive, 
  BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(ACCOUNT.accttype)) AS accttype, 
  BUILTIN_RESULT.TYPE_STRING(ACCOUNT.acctnumber) AS acctnumber, 
  BUILTIN_RESULT.TYPE_STRING(ACCOUNT.accountsearchdisplaynamecopy) AS accountsearchdisplaynamecopy, 
  BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(transactionLine.expenseaccount)) AS expenseaccount, 
  BUILTIN_RESULT.TYPE_DATE(TRANSACTION.trandate) AS trandate, 
  BUILTIN_RESULT.TYPE_CURRENCY(BUILTIN.CONSOLIDATE(transactionLine.netamount, 'INCOME', 'NONE', 'DEFAULT', 0, 0, 'DEFAULT'), 
  	BUILTIN.CURRENCY(BUILTIN.CONSOLIDATE(transactionLine.netamount, 'INCOME', 'NONE', 'DEFAULT', 0, 0, 'DEFAULT'))) AS netamount, 
  BUILTIN_RESULT.TYPE_CURRENCY(BUILTIN.CONSOLIDATE(transactionLine.custcol_avc_ending_bal, 'INCOME', 'NONE', 'DEFAULT', 0, 0, 'DEFAULT'), 
  	BUILTIN.CURRENCY(BUILTIN.CONSOLIDATE(transactionLine.custcol_avc_ending_bal, 'INCOME', 'NONE', 'DEFAULT', 0, 0, 'DEFAULT'))) AS custcol_avc_ending_bal, 
  BUILTIN_RESULT.TYPE_STRING('[Internal_Ending_Bal_Diff]') AS Internal_Ending_Bal_Diff
FROM 
  TRANSACTION, 
  Subsidiary, 
  ACCOUNT, 
  TransactionAccountingLine, 
  transactionLine
WHERE 
  ((((transactionLine.subsidiary = Subsidiary.ID(+) AND TransactionAccountingLine.ACCOUNT = ACCOUNT.ID(+)) 
  	AND (transactionLine.TRANSACTION = TransactionAccountingLine.TRANSACTION AND transactionLine.ID = TransactionAccountingLine.transactionline)) 
  	AND TRANSACTION.ID = transactionLine.TRANSACTION))
   AND ((NVL(ACCOUNT.isinactive, 'F') = ? 
   AND UPPER(ACCOUNT.accountsearchdisplaynamecopy) LIKE ? 
   AND ACCOUNT.accttype IN ('LongTermLiab') AND transactionLine.custcol_avc_ending_bal IS NOT NULL 
   AND TRANSACTION.trandate <= TO_TIMESTAMP(?, 'YYYY-MM-DD HH24:MI:SS')))
ORDER BY 
  TRANSACTION.trandate DESC NULLS LAST	
	`;

	const suiteQL3 = `
SELECT 
  TRANSACTION.ID AS ID, 
  TRANSACTION.trandisplayname AS trandisplayname, 
  transactionLine.subsidiary AS subsidiary, 
  Subsidiary.name AS name, 
  ACCOUNT.ID AS id_1, 
  ACCOUNT.isinactive AS isinactive, 
  ACCOUNT.accttype AS accttype, 
  ACCOUNT.acctnumber AS acctnumber, 
  ACCOUNT.accountsearchdisplaynamecopy AS accountsearchdisplaynamecopy, 
  transactionLine.expenseaccount AS expenseaccount, 
  TRANSACTION.trandate AS trandate, 
  transactionLine.netamount AS netamount, 
  transactionLine.custcol_avc_ending_bal AS custcol_avc_ending_bal,
  '[Internal_Ending_Bal_Diff]' AS Internal_Ending_Bal_Diff
FROM 
  TRANSACTION
LEFT JOIN transactionLine ON TRANSACTION.ID = transactionLine.TRANSACTION
LEFT JOIN TransactionAccountingLine ON transactionLine.TRANSACTION = TransactionAccountingLine.TRANSACTION 
                                    AND transactionLine.ID = TransactionAccountingLine.transactionline
LEFT JOIN Subsidiary ON transactionLine.subsidiary = Subsidiary.ID
LEFT JOIN ACCOUNT ON TransactionAccountingLine.ACCOUNT = ACCOUNT.ID
WHERE 
  NVL(ACCOUNT.isinactive, 'F') = ? 
  AND UPPER(ACCOUNT.accountsearchdisplaynamecopy) LIKE ? 
  AND ACCOUNT.accttype IN ('LongTermLiab') 
  AND transactionLine.custcol_avc_ending_bal IS NOT NULL 
  AND TRANSACTION.trandate <= TO_TIMESTAMP(?, 'YYYY-MM-DD HH24:MI:SS')
ORDER BY 
  TRANSACTION.trandate DESC NULLS LAST
	`;


let suiteQL4 = `
SELECT 
	TRANSACTION.ID AS TransactionID, 
	TRANSACTION.trandisplayname AS trandisplayname,
	transactionLine.subsidiary, 
	TransactionAccountingLine.ACCOUNT,
	ACCOUNT.acctnumber AS acctnumber,
	ACCOUNT.accountsearchdisplaynamecopy AS accountsearchdisplaynamecopy,
	transactionLine.custcol_avc_ending_bal AS custcol_avc_ending_bal
FROM TRANSACTION
INNER JOIN transactionLine ON TRANSACTION.ID = transactionLine.TRANSACTION
INNER JOIN TransactionAccountingLine ON transactionLine.TRANSACTION = TransactionAccountingLine.TRANSACTION 
                               AND transactionLine.ID = TransactionAccountingLine.transactionline
INNER JOIN ACCOUNT ON TransactionAccountingLine.ACCOUNT = ACCOUNT.ID                               
WHERE transactionLine.subsidiary IS NOT NULL
  AND TransactionAccountingLine.ACCOUNT IS NOT NULL
  AND transactionLine.custcol_avc_ending_bal IS NOT NULL
	  AND UPPER(ACCOUNT.accountsearchdisplaynamecopy) LIKE ?
  	AND NVL(ACCOUNT.isinactive, 'F') = ?                          
  AND TRANSACTION.trandate = (
    SELECT MAX(tr.trandate)
    FROM TRANSACTION tr
    INNER JOIN transactionLine tl ON tr.ID = tl.TRANSACTION
    INNER JOIN TransactionAccountingLine tal ON tl.TRANSACTION = tal.TRANSACTION 
                                      AND tl.ID = tal.transactionline
		INNER JOIN ACCOUNT a ON tal.ACCOUNT = a.ID                                      
    WHERE tl.subsidiary = transactionLine.subsidiary
      AND tal.ACCOUNT = TransactionAccountingLine.ACCOUNT
      AND tr.trandate <= TO_TIMESTAMP(?, 'YYYY-MM-DD HH24:MI:SS')        
)
ORDER BY TRANSACTION.trandate DESC;
	`;

suiteQL4 = `
SELECT 
  BUILTIN_RESULT.TYPE_INTEGER(TRANSACTION.ID) AS ID, 
  BUILTIN_RESULT.TYPE_STRING(TRANSACTION.trandisplayname) AS trandisplayname, 
  BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(transactionLine.subsidiary)) AS subsidiary, 
  BUILTIN_RESULT.TYPE_STRING(Subsidiary.name) AS name, 
  BUILTIN_RESULT.TYPE_INTEGER(ACCOUNT.ID) AS id_1, 
  BUILTIN_RESULT.TYPE_BOOLEAN(ACCOUNT.isinactive) AS isinactive, 
  BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(ACCOUNT.accttype)) AS accttype, 
  BUILTIN_RESULT.TYPE_STRING(ACCOUNT.acctnumber) AS acctnumber, 
  BUILTIN_RESULT.TYPE_STRING(ACCOUNT.accountsearchdisplaynamecopy) AS accountsearchdisplaynamecopy, 
  BUILTIN_RESULT.TYPE_STRING(BUILTIN.DF(transactionLine.expenseaccount)) AS expenseaccount, 
  BUILTIN_RESULT.TYPE_DATE(TRANSACTION.trandate) AS trandate, 
  BUILTIN_RESULT.TYPE_CURRENCY(BUILTIN.CONSOLIDATE(transactionLine.netamount, 'INCOME', 'NONE', 'DEFAULT', 0, 0, 'DEFAULT'), BUILTIN.CURRENCY(BUILTIN.CONSOLIDATE(transactionLine.netamount, 'INCOME', 'NONE', 'DEFAULT', 0, 0, 'DEFAULT'))) AS netamount, 
  BUILTIN_RESULT.TYPE_CURRENCY(BUILTIN.CONSOLIDATE(transactionLine.custcol_avc_ending_bal, 'INCOME', 'NONE', 'DEFAULT', 0, 0, 'DEFAULT'), BUILTIN.CURRENCY(BUILTIN.CONSOLIDATE(transactionLine.custcol_avc_ending_bal, 'INCOME', 'NONE', 'DEFAULT', 0, 0, 'DEFAULT'))) AS custcol_avc_ending_bal, 
  BUILTIN_RESULT.TYPE_STRING('[Internal_Ending_Bal_Diff]') AS Internal_Ending_Bal
FROM 
  TRANSACTION
		JOIN transactionLine ON TRANSACTION.ID = transactionLine.TRANSACTION
		JOIN TransactionAccountingLine ON transactionLine.TRANSACTION = TransactionAccountingLine.TRANSACTION 
                               AND transactionLine.ID = TransactionAccountingLine.transactionline
    JOIN Subsidiary ON transactionLine.subsidiary = Subsidiary.ID
		JOIN ACCOUNT ON TransactionAccountingLine.ACCOUNT = ACCOUNT.ID    
WHERE 
  NVL(ACCOUNT.isinactive, 'F') = ?
  AND UPPER(ACCOUNT.accountsearchdisplaynamecopy) LIKE ?
  AND ACCOUNT.accttype IN ('LongTermLiab')
  AND transactionLine.custcol_avc_ending_bal IS NOT NULL
  AND TRANSACTION.trandate <= TO_TIMESTAMP(?, 'YYYY-MM-DD HH24:MI:SS')
  AND TRANSACTION.trandate = (
    SELECT MAX(trandate)
    FROM TRANSACTION TR
    JOIN transactionLine TL ON TR.ID = TL.TRANSACTION
    JOIN TransactionAccountingLine TAL ON TL.TRANSACTION = TAL.TRANSACTION 
                                      AND TL.ID = TAL.transactionline
		JOIN ACCOUNT A ON TAL.ACCOUNT = A.ID  
    WHERE NVL(A.isinactive, 'F') = ?
    AND UPPER(A.accountsearchdisplaynamecopy) LIKE ?
    AND A.accttype IN ('LongTermLiab')
    AND TL.custcol_avc_ending_bal IS NOT NULL
  )
ORDER BY 
  ACCOUNT.acctnumber ASC NULLS LAST
`;

	let paramInactive = 'F';
	let paramName = '%M/P-SELCO%';
	let paramDate = '2022-12-31 23:59:59';
	const suiteQLResult3 = query.runSuiteQL({
		query: suiteQL3,
		params: [paramInactive, paramName, paramDate],
	});
	elog.debug("sqlResult3", suiteQLResult3, eOpt);
	let sqlRecords3 = suiteQLResult3.asMappedResults();
	elog.debug("sqlRecords3", sqlRecords3, eOpt);


	const suiteQLResult4 = query.runSuiteQL({
		query: suiteQL4,
		//params: [paramName, paramInactive, paramDate],
		params: [paramInactive, paramName, paramDate, paramInactive, paramName],
	});
	elog.debug("sqlResult4", suiteQLResult4, eOpt);
	let sqlRecords4 = suiteQLResult4.asMappedResults();
	elog.debug("sqlRecords4", sqlRecords4, eOpt);

	return suiteQLResult4;

}




export function createFilterForm(form: ui.Form): ui.Form {
	let stLogTitle = "createFilterForm";


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

	const dateField = form.addField({
		id: `${gFilterFormId}_date`,
		type: ui.FieldType.DATE,
		label: 'Date (Ending Balances thru this date)',
	});

	const accountNameField = form.addField({
		id: `${gFilterFormId}_accountname`,
		type: ui.FieldType.TEXT,
		label: 'Account Name'
	});

	// Add a submit button to the form
	form.addSubmitButton({
		label: 'Filter',
	});

	return form;
}


function createAcctBalSublist(form : serverWidget.Form, sublistName : string, acctBalList : avm.ObjSql) : serverWidget.Sublist {
	let stLogTitle = "createAcctBalSublist";
	let eOpt : avm.EnhLogOptions = {
		function: 'createAcctBalSublist',
		tags: ['AcctBal', 'Sublist'],
	};
	//elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.

	try {
		elog.debug(`sublistName`, sublistName, eOpt);
		let sublistTitle = "Account Balance List";
		let sublist = form.addSublist({
			id: 'custpage_' + sublistName,
			type: serverWidget.SublistType.LIST,
			label: sublistTitle
		});

		let recs = acctBalList.records;
		let cols = acctBalList.columns;
		// Create the sublist from the Columns
		elog.debug(`Build Sublist`, `Columns: ${cols.length}`, eOpt);
		cols.forEach( (col : avm.Column, cIndex) => {
			elog.audit(`sublist.addField:col`, JSON.stringify(col), eOpt, "audit");
			let cType = col.type;
			if (cType != ReturnType.HIDDEN) {
				sublist.addField({
					id: 'custpage_' + sublistName + '_' + col.aliasId,
					label: col.label ?? col.alias,
					type: serverWidget.FieldType.TEXTAREA
				});
			}
		});

		// Loop thru Records and Cols and Fill Sublist
		recs.forEach((rec, rIndex) => {
			// Loop thru Columns - Set Values
			cols.forEach((col:avm.Column, cIndex) => {
				let cAlias = col.alias;
				let cType = col.type;
				if (cType != ReturnType.HIDDEN) {
					// Get the Value from the rec object
					let cValue = rec[cAlias] ?? ' ';
					let cValueDisplay = cValue?.toString() ?? ' '; // this MUST be set to at LEAST 1 space, otherwise, it throws an ERROR!
					let id = 'custpage_' + sublistName + '_' + col.aliasId;

					// Set the Sublist Value
					sublist.setSublistValue({
						id: id,
						line: rIndex,
						value: cValueDisplay,
					});
				}

			}); // Loop thru cols.forEach()
		}); // Loop thru recs.forEach()


		// Add Button to Sublist
		// sublist.addButton({
		// 	id: 'custpage_' + sublistName + '_btn_dl_vlist',
		// 	label: 'Update/Create CSV Files',
		// 	functionName: 'callSL_UpdateCSVFiles'
		// });
		//
		// sublist.addRefreshButton();

		return sublist;
	} catch (e) {
		elog.error('Error creating Account Balance sublist - ' + e.name, e.message, eOpt);
		elog.error('Error creating Account Balance sublist - ' + e.name + ' stacktrace:', e.stack, eOpt);
	}
}



// @ts-ignore
export function createSublist(form: ui.Form, sublistname: string): ui.Sublist {
	let stLogTitle = "createSublist";
	let eOpt : avm.EnhLogOptions = {
		function: 'createSublist',
		tags: ['Sublist'],
	};
	avm.elog.debug(`form`, JSON.stringify(form), eOpt);

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


export function combineTranAcctList(tranAcctInternalBalList: avm.ObjSql, tranAcctEndingBalList : avm.ObjSql) : avm.ObjSql {
	let stLogTitle = "combineTranAcctList";
	let eOpt : avm.EnhLogOptions = {
		function: 'combineTranAcctList',
		tags: ['TranAcct'],
	};
	// Combine Records
	const acctBalListJoin = tranAcctInternalBalList.records.map((obj1) => {
		const match = tranAcctEndingBalList.records.find((obj2) => obj2["account.id"] === obj1["account.id"]);
		return {...obj1, ...match};
	});
	avm.elog.debug(`acctBalListJoin`, JSON.stringify(acctBalListJoin),eOpt);

	// Combine Columns & Types
	//const columnJoin = [...tranAcctInternalBalList.columns, ...tranAcctEndingBalList.columns];
	const columnJoin = avm.combineColumns(tranAcctInternalBalList.columns, tranAcctEndingBalList.columns);

	let objSQLJoin = {
		recordCount: acctBalListJoin.length,
		time: tranAcctInternalBalList.time + tranAcctEndingBalList.time,
		records: acctBalListJoin,
		columns: columnJoin,
	}
	avm.elog.debug(`objSQLJoin`, objSQLJoin, eOpt);

	return objSQLJoin;
}

/*
 * Get the Transaction Account Balance ObjSql Object filled with records as indicated by the reqest.parameters provided
 * This is used for determining the INTERNAL BALANCE of an Account
 *
 */
export function getTranAcctInternalBalResults(request : ServerRequest) : avm.ObjSql {
	let stLogTitle = "getTranAcctBal";
	let eOpt : avm.EnhLogOptions = {
		function: 'getTranAcctBal',
		tags: ['TranAcct'],
	};
	const accountType = request.parameters[`${gFilterFormId}_accounttype`];
	const dateOnOrBefore = request.parameters[`${gFilterFormId}_date`];
	const accountName = request.parameters[`${gFilterFormId}_accountname`];

	//// Query 1 Test
	const tranOptions: avm.TranAcctBalQueryOptions = {
		accttype: accountType,
		isinactive: false,
		trandateOnOrBefore: dateOnOrBefore,
		accountname: accountName,
		displayColumns: [
			{
				fieldId: avm.TranQueryFields.ACCOUNT_Id,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTIONLINES_Subsidiary,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTIONLINES_Subsidiary,
				groupBy: true,
				context: query.FieldContext.DISPLAY,
				alias: avm.TranQueryFields.TRANSACTIONLINES_Subsidiary_Display
			},
			{
				fieldId: avm.TranQueryFields.ACCOUNT_AcctNumber,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.ACCOUNT_AccountSearchDisplayNameCopy,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTIONLINES_ExpenseAccount,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTIONLINES_ExpenseAccount,
				groupBy: true,
				context: query.FieldContext.DISPLAY,
				alias: avm.TranQueryFields.TRANSACTIONLINES_ExpenseAccount_Display
			},
			{
				fieldId: avm.TranQueryFields.ACCOUNT_AcctType,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTIONLINES_NetAmount,
				groupBy: false,
				aggregate: query.Aggregate.SUM,
			},
		],
	};
	let acctInternalBalList = avm.getAcctBalQueryResultSet(tranOptions);
	//let acctInternalBalList = avm.getAcctBalQueryResultSet();
	//log.debug(`${stLogTitle}:acctInternalBalList`, JSON.stringify(acctInternalBalList));
	avm.elog.debug(`acctInternalBalList`, acctInternalBalList, eOpt);
	//log.debug(`${stLogTitle}:acctInternalBalList.records[0]`, JSON.stringify(acctInternalBalList.records[0]));
	/* Example Output:
	{
  "account.id": 1151,
  "transactionlines.subsidiary": 2,
  "account.acctnumber": "260.090",
  "account.accountsearchdisplaynamecopy": "M/P-Citizens Bank (LV 260.09)",
  "transactionlines.expenseaccount": 1151,
  "account.accttype": "LongTermLiab",
  "transactionlines.netamount": 0
	}
	*/

	return acctInternalBalList;
}

/*
 * Get the Transaction Account Ending Balance ObjSql Object filled with records as indicated by the reqest.parameters provided
 * This is used for determining the most recent ENDING BALANCE of an Account (up thru the Date in the parameters).
 *
 */
export function getTranAcctEndingBalResults(request: ServerRequest) : avm.ObjSql {
	let stLogTitle = "getTranAcctEndingBalResults";
	let eOpt : avm.EnhLogOptions = {
		function: 'getTranAcctEndingBalResults',
		tags: ['TranAcct'],
	};
	const accountType = request.parameters[`${gFilterFormId}_accounttype`];
	const dateOnOrBefore = request.parameters[`${gFilterFormId}_date`];
	const accountName = request.parameters[`${gFilterFormId}_accountname`];
	const accountIds = request.parameters[`${gFilterFormId}_accountIds`];


	//// - Query 2 Test
	const tranOptions: avm.TranAcctBalQueryOptions = {
		accttype: accountType,
		isinactive: false,
		trandateOnOrBefore: dateOnOrBefore,
		accountname: accountName,
		//endingBalanceNotEmpty: true,
		filters: [
			{fieldId: avm.TranQueryFields.TRANSACTIONLINES_EndingBalance, operator: query.Operator.EMPTY_NOT, values: []}
		],
		displayColumns: [
			{
				fieldId: avm.TranQueryFields.ACCOUNT_Id,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTIONLINES_Subsidiary,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.ACCOUNT_AcctNumber,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.ACCOUNT_AccountSearchDisplayNameCopy,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTIONLINES_ExpenseAccount,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.ACCOUNT_AcctType,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTION_Id,
				groupBy: true,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTION_Id,
				groupBy: true,
				context: query.FieldContext.DISPLAY,
				alias: avm.TranQueryFields.TRANSACTION_Id_Display,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTION_Date,
				groupBy: false,
				aggregate: query.Aggregate.MAXIMUM,
			},
			{
				fieldId: avm.TranQueryFields.TRANSACTIONLINES_EndingBalance,
				groupBy: true,
			},
			{
				alias: avm.TranQueryFields.FORMULA_Internal_Ending_Bal_Diff,
				groupBy: false,
				formula: `'[${avm.TranQueryFields.FORMULA_Internal_Ending_Bal_Diff}]'`,
				//type: query.ReturnType.CURRENCY,
			},
		],
		// sortOptions: {
		// 	fieldId: avm.TranQueryFields.TRANSACTION_Id,
		// 	//fieldId: avm.TranQueryFields.TRANSACTION_Date,
		// 	ascending: false,
		// }
	};

	// Ensure Default Values are set in Options
	// tranOptions.displayColumns = tranOptions.displayColumns.map((column, index) => {
	// 	return {
	// 		...column, // Spread existing column properties
	// 		fieldId: column.fieldId || "", // If fieldId is undefined, set it to an empty string
	// 	};
	// });


	let acctEndingBalList = avm.getAcctBalQueryResultSet(tranOptions);
	//let acctBalList = avm.getAcctBalQueryResultSet();
	//log.debug(`${stLogTitle}:acctEndingBalList`, JSON.stringify(acctEndingBalList));
	avm.elog.debug(`acctEndingBalList`, acctEndingBalList, eOpt);
	//log.debug(`${stLogTitle}:acctEndingBalList.resultSet.columns`, JSON.stringify(acctEndingBalList.resultSet.columns));
	//log.debug(`${stLogTitle}:acctEndingBalList.resultSet.types`, JSON.stringify(acctEndingBalList.resultSet.types));
	//log.debug(`${stLogTitle}:acctEndingBalList.records[0]`, JSON.stringify(acctEndingBalList.records[0]));
	/* Example Output:
	{
	  "account.id": 1146,
	  "transactionlines.subsidiary": 2,
	  "account.acctnumber": "260.040",
	  "account.accountsearchdisplaynamecopy": "M/P-DKF-LV4-Plex(260.04)",
	  "transactionlines.expenseaccount": 1146,
	  "account.accttype": "LongTermLiab",
	  "transactionlines.id": 120,
	  "transactionlines.custcol_avc_ending_bal": null
	}
	 */

	// let acctEndingBalListSql = avm.createAcctBalQuerySQL(tranOptions);
	// avm.elog.debug(`acctEndingBalListSql`, acctEndingBalListSql, eOpt);

	return acctEndingBalList;
}


export function getTranAcct_EndingBalColumns() : avm.TranAcctBalQueryOptionDisplayColumns[] {

	const endBalColumns = [
		{
			fieldId: avm.TranQueryFields.ACCOUNT_Id,
			groupBy: true,
		},
		{
			fieldId: avm.TranQueryFields.TRANSACTIONLINES_Subsidiary,
			groupBy: true,
		},
		{
			fieldId: avm.TranQueryFields.ACCOUNT_AcctNumber,
			groupBy: true,
		},
		{
			fieldId: avm.TranQueryFields.ACCOUNT_AccountSearchDisplayNameCopy,
			groupBy: true,
		},
		{
			fieldId: avm.TranQueryFields.TRANSACTIONLINES_ExpenseAccount,
			groupBy: true,
		},
		{
			fieldId: avm.TranQueryFields.ACCOUNT_AcctType,
			groupBy: true,
		},
		{
			fieldId: avm.TranQueryFields.TRANSACTION_Id,
			groupBy: true,
		},
		{
			fieldId: avm.TranQueryFields.TRANSACTION_Id,
			groupBy: true,
			context: query.FieldContext.DISPLAY,
			alias: avm.TranQueryFields.TRANSACTION_Id_Display,
		},
		{
			fieldId: avm.TranQueryFields.TRANSACTION_Date,
			groupBy: true,
			// If sorting by Date, do NOT set this Aggregate, or it will ERROR (and not tell you WHY!?)
			//groupBy: false,
			//aggregate: query.Aggregate.MAXIMUM,
		},
		{
			fieldId: avm.TranQueryFields.TRANSACTIONLINES_EndingBalance,
			groupBy: true,
		},
		{
			alias: avm.TranQueryFields.FORMULA_Internal_Ending_Bal_Diff,
			groupBy: false,
			formula: `'[${avm.TranQueryFields.FORMULA_Internal_Ending_Bal_Diff}]'`,
			//type: query.ReturnType.CURRENCY,
		},
	];

	return endBalColumns;
}

export function getTranAcct_LastEndingBalResult(subId : number, accountId: number, parameters: any) : avm.ObjSql {
	let eOpt : avm.EnhLogOptions = {
		function: 'getTranAcct_LastEndingBalResult',
		tags: ['TranAcct'],
	};
	elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.
	const accountType = parameters[`${gFilterFormId}_accounttype`];
	const dateOnOrBefore = parameters[`${gFilterFormId}_date`];
	const accountName = parameters[`${gFilterFormId}_accountname`];


	//// - Latest Ending Balance
	const tranOptions: avm.TranAcctBalQueryOptions = {
		accttype: accountType,
		isinactive: false,
		trandateOnOrBefore: dateOnOrBefore,
		//endingBalanceNotEmpty: true,
		filters: [
			{fieldId: avm.TranQueryFields.TRANSACTIONLINES_EndingBalance, operator: query.Operator.EMPTY_NOT, values: []},
			{fieldId: avm.TranQueryFields.TRANSACTIONLINES_Subsidiary, operator: query.Operator.EQUAL, values: [subId]},
			{fieldId: avm.TranQueryFields.ACCOUNT_Id, operator: query.Operator.EQUAL, values: [accountId]},
		],
		displayColumns: getTranAcct_EndingBalColumns(),
		sortOptions: {
			// fieldId: avm.TranQueryFields.TRANSACTION_Id,
			fieldId: avm.TranQueryFields.TRANSACTION_Date,
			ascending: false,
		},
		resultLimit: 1,
	};

	let acctTranList = avm.getAcctBalQueryResultSet(tranOptions);
	//let acctBalList = avm.getAcctBalQueryResultSet();
	//log.debug(`${stLogTitle}:acctTranList`, JSON.stringify(acctTranList));
	avm.elog.debug(`acctTranList`, acctTranList, eOpt);
	//log.debug(`${stLogTitle}:acctTranList.resultSet.columns`, JSON.stringify(acctTranList.resultSet.columns));
	//log.debug(`${stLogTitle}:acctTranList.resultSet.types`, JSON.stringify(acctTranList.resultSet.types));
	//log.debug(`${stLogTitle}:acctTranList.records[0]`, JSON.stringify(acctTranList.records[0]));
	/* Example Output:
	{
	  "account.id": 1146,
	  "transactionlines.subsidiary": 2,
	  "account.acctnumber": "260.040",
	  "account.accountsearchdisplaynamecopy": "M/P-DKF-LV4-Plex(260.04)",
	  "transactionlines.expenseaccount": 1146,
	  "account.accttype": "LongTermLiab",
	  "transactionlines.id": 120,
	  "transactionlines.custcol_avc_ending_bal": null
	}
	 */

	return acctTranList;
}

export function getTranAcct_LastTransaction(subId : number, accountId: number, parameters: any) : avm.ObjSql {
	let eOpt : avm.EnhLogOptions = {
		function: 'getTranAcct_LastTransaction',
		tags: ['TranAcct'],
	};
	elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.
	const accountType = parameters[`${gFilterFormId}_accounttype`];
	const dateOnOrBefore = parameters[`${gFilterFormId}_date`];
	const accountName = parameters[`${gFilterFormId}_accountname`];

	//// - Latest Transaction
	const tranOptions: avm.TranAcctBalQueryOptions = {
		accttype: accountType,
		isinactive: false,
		trandateOnOrBefore: dateOnOrBefore,
		//endingBalanceNotEmpty: true,
		filters: [
			{fieldId: avm.TranQueryFields.TRANSACTIONLINES_Subsidiary, operator: query.Operator.EQUAL, values: [subId]},
			{fieldId: avm.TranQueryFields.ACCOUNT_Id, operator: query.Operator.EQUAL, values: [accountId]},
		],
		displayColumns: getTranAcct_EndingBalColumns(),
		sortOptions: {
			// fieldId: avm.TranQueryFields.TRANSACTION_Id,
			fieldId: avm.TranQueryFields.TRANSACTION_Date,
			ascending: false,
		},
		resultLimit: 1,
	};

	let acctTranList = avm.getAcctBalQueryResultSet(tranOptions);
	//let acctBalList = avm.getAcctBalQueryResultSet();
	//log.debug(`${stLogTitle}:acctTranList`, JSON.stringify(acctTranList));
	avm.elog.debug(`acctTranList`, acctTranList, eOpt);
	//log.debug(`${stLogTitle}:acctTranList.resultSet.columns`, JSON.stringify(acctTranList.resultSet.columns));
	//log.debug(`${stLogTitle}:acctTranList.resultSet.types`, JSON.stringify(acctTranList.resultSet.types));
	//log.debug(`${stLogTitle}:acctTranList.records[0]`, JSON.stringify(acctTranList.records[0]));
	/* Example Output:
	{
	  "account.id": 1146,
	  "transactionlines.subsidiary": 2,
	  "account.acctnumber": "260.040",
	  "account.accountsearchdisplaynamecopy": "M/P-DKF-LV4-Plex(260.04)",
	  "transactionlines.expenseaccount": 1146,
	  "account.accttype": "LongTermLiab",
	  "transactionlines.id": 120,
	  "transactionlines.custcol_avc_ending_bal": null
	}
	 */

	return acctTranList;
}

// TODO: Fix End.Bal/Latest Bill Column so it ALWAYS shows the LATEST BILL regardless of Ending Balance
// TODO: Fix Ending Balance col so it is a link to the Bill where the Ending Balance comes from
//  To do this, I will have to do the following:
//  > Rename the Alias used for the TranID that is returned from the Ending Bal query, use that if there is an Ending Bal
//  > ALWAYS call the Last Bill Query since I will ALWAYS need that. Use the TranID from that query, to set the
//    Latest Bill column

export function updateTranAcctBalResults(tranAcctList : avm.ObjSql, parameters: any) {
	let eOpt : EnhLogOptions = {
		function: 'updateTranAcctBalResults',
		tags: ['TranAcct'],
	};
	elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.

	elog.debug("tranAcctList", tranAcctList, eOpt);
	elog.debug("parameters", JSON.stringify(parameters), eOpt, ["force"]);

	// Process Records
	tranAcctList.records.forEach((rec, i) => {
		const accountId = rec["account.id"] as number;
		const subsidiary = rec["transactionlines.subsidiary"] as number;

		elog.debug("InternalBal Record:BEFORE", rec, eOpt, []);
		const endingBalList = getTranAcct_LastEndingBalResult(subsidiary, accountId, parameters);
		elog.debug("recordCount", endingBalList.recordCount, eOpt, ["force"]);
		if (endingBalList.recordCount == 1) {
			// Found Ending Balance Record, combine with existing record
			elog.debug("FOUND Ending Balance Record. Record:", endingBalList.records[0], eOpt);
			tranAcctList.records[i] = { ...rec, ...endingBalList.records[0] };
			tranAcctList.columns = avm.combineColumns(tranAcctList.columns, endingBalList.columns);
		} else {
			// No Ending Balance Record, get most recent Transaction Record
			elog.debug("NO Ending Balance Record. recordCount:", endingBalList.recordCount, eOpt);
			const lastTranList = getTranAcct_LastTransaction(subsidiary, accountId, parameters);
			if (lastTranList.recordCount == 1) {
				elog.debug("FOUND Last Transaction Record. Record:", lastTranList.records[0], eOpt);
				tranAcctList.records[i] = { ...rec, ...lastTranList.records[0] };
				tranAcctList.columns = avm.combineColumns(tranAcctList.columns, lastTranList.columns);
			}
		}
		elog.debug("InternalBal Record:AFTER", rec, eOpt, []);
	});

}

