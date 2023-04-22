/**
 * avc_sl_util.ts
 *
 * @NScriptName AVC | SuiteLet Util Functions
 * @NApiVersion 2.1
 *
 * Purpose: Provide Util Functions for AVC SuiteLet routines
 *
 */

// IMPORTS
import log = require('N/log');
// @ts-ignore
import record = require('N/record');
import query = require('N/query');

// @ts-ignore
import {url, file, format, error, search} from 'N';
import {Type} from "N/record";


// INTERFACES
export interface ObjSql {
	recordCount: number,
	time: number,
	records: Array<{ [fieldId: string]: string | boolean | number | null }>,
	resultSet?: query.ResultSet
}

// DATABASE FUNCTIONS

//export function createCondition(options: any): query.Condition;


// @ts-ignore
export function createAccountSearch(accountType: string, date: string): search.Search {
	let stLogTitle = "createAccountSearch";
	log.debug(`${stLogTitle}:(accountType, date)`, `${accountType}, ${date}`);

	// Create a search to retrieve the accounts based on the filter criteria
	const accountSearch = search.create({
		type: search.Type.ACCOUNT,
		filters: [
			'isinactive', search.Operator.IS, 'F',
		],
		columns: [
			'name',
			'type',
			'number',
			//'currency',
			'balance',
		],
	});

	// This does NOT work.
	// const joinedTransactionColumn = search.createColumn({
	// 	name: 'formulabalance',
	// 	label: 'Joined Transaction Balance',
	// 	formula: 'SUM(CASE WHEN {account.internalid} = {transaction.account} AND {transaction.date} <= "' + date + '" THEN {transaction.amount} ELSE 0 END)'
	// });
	// accountSearch.columns.push(joinedTransactionColumn);


	if (accountType) {
		accountSearch.filters.push(
			search.createFilter({
				name: 'type',
				operator: search.Operator.IS,
				values: [accountType],
			})
		);
	}

	// if (date) {
	// 	accountSearch.filters.push(
	// 		search.createFilter({
	// 			name: 'lastmodifieddate',
	// 			operator: search.Operator.ONORBEFORE,
	// 			values: [date]
	// 		})
	// 	);
	// }

	log.debug(`${stLogTitle}:accountSearch`, JSON.stringify(accountSearch));
	return accountSearch;
}

// @ts-ignore
export function getAccountTypes(): { value: string; text: string }[] {
	// To figure out what options exist here, use the Data Browser and select the "Analytics Browser" tab
	const accountTypesQuery = `
    SELECT id, longname
    FROM AccountType
    ORDER BY longname
  `;

	const accountTypesResultSet = query.runSuiteQL({
		query: accountTypesQuery,
	});

	const accountTypes: { value: string; text: string }[] = [];

	accountTypesResultSet.results.forEach((result) => {
		const idValue = result.values[0] as string;
		const nameValue = result.values[1] as string;
		accountTypes.push({
			value: idValue,
			text: nameValue,
		});
	});

	return accountTypes;
}


export function getAccountBalRptList(asLinks : boolean = false, qryCondition? : query.Condition): ObjSql {
	let stLogTitle = 'getAccountBalRptList';
	log.debug(`${stLogTitle}:asLinks`, asLinks);

	// @ts-ignore
	let qryList = getResultByQueryId('custdataset_avc_ds_accountbalrpt', qryCondition);
	log.debug(`${stLogTitle}:qryList`, JSON.stringify(qryList));

	//let qryAccountBalRptList = processList(qryList, asLinks);
	let qryAccountBalRptList = qryList;

	return qryAccountBalRptList;
} // getAccountBalRptList



interface TranAcctBalQueryOptions {
	accttype?: string | string[];
	isinactive?: boolean;
	trandateOnOrBefore?: string;
}

export function createAcctBalQuery(options?: TranAcctBalQueryOptions): query.Query {
	const transactionQuery: query.Query = query.create({
		type: query.Type.TRANSACTION,
	});

	/* Joins */
	const transactionLinesJoin = transactionQuery.autoJoin({
		fieldId: 'transactionlines',
	});

	const accountingImpactJoin = transactionLinesJoin.autoJoin({
		fieldId: 'accountingimpact',
	});

	const accountJoin = accountingImpactJoin.autoJoin({
		fieldId: 'account',
	});

	/* Conditions */
	const conditions: query.Condition[] = [];

	if (options?.accttype) {
		const acctTypeValues = Array.isArray(options.accttype)
			? options.accttype
			: [options.accttype];
		const acctTypeCondition = accountJoin.createCondition({
			fieldId: 'accttype',
			operator: query.Operator.ANY_OF,
			values: acctTypeValues,
		});
		conditions.push(acctTypeCondition);
	}

	if (options?.isinactive) {
		const inactiveCondition = accountJoin.createCondition({
			fieldId: 'isinactive',
			operator: query.Operator.IS,
			values: [options.isinactive],
		});
		conditions.push(inactiveCondition);
	}

	if (options?.trandateOnOrBefore) {
		const dateCondition = transactionQuery.createCondition({
			fieldId: 'trandate',
			operator: query.Operator.ON_OR_BEFORE,
			values: [options.trandateOnOrBefore],
		});
		conditions.push(dateCondition);
	}

	// Uses the Spread Operator (...) to expand "conditions" to be an array of parameters.
	if (conditions.length > 0) {
		transactionQuery.condition = transactionQuery.and(...conditions);
	}

	/* Columns */
	const transactionIdColumn = transactionQuery.createColumn({
		fieldId: 'id',
		groupBy: false,
		alias: 'tranid',
	});

	const transactionDisplayNameColumn = transactionQuery.createColumn({
		fieldId: 'trandisplayname',
		groupBy: false,
		alias: 'trandisplayname',
	});

	const subsidiaryColumn = transactionLinesJoin.createColumn({
		fieldId: 'subsidiary',
		groupBy: false,
		context: {
			name: 'DISPLAY',
		},
		alias: 'subsidiary',
	});

	const accountIdColumn = accountJoin.createColumn({
		fieldId: 'id',
		groupBy: false,
		alias: 'accountid',
	});

	const inactiveColumn = accountJoin.createColumn({
		fieldId: 'isinactive',
		groupBy: false,
		alias: 'isinactive',
	});

	const accountTypeColumn = accountJoin.createColumn({
		fieldId: 'accttype',
		groupBy: false,
		alias: 'accttype',
	});

	const expenseAccountColumn = transactionLinesJoin.createColumn({
		fieldId: 'expenseaccount',
		groupBy: false,
		context: {
			name: 'DISPLAY',
		},
		alias: 'expenseaccount',
	});

	const transactionDateColumn = transactionQuery.createColumn({
		fieldId: 'trandate',
		groupBy: false,
		alias: 'trandate',
	});

	const netAmountColumn = transactionLinesJoin.createColumn({
		fieldId: 'netamount',
		groupBy: false,
		aggregate: query.Aggregate.SUM,
		alias: 'netamount',
	});

	const endingBalanceColumn = transactionLinesJoin.createColumn({
		fieldId: 'custcol_avc_ending_bal',
		groupBy: false,
		alias: 'custcol_avc_ending_bal',
	});

	transactionQuery.columns = [
		transactionIdColumn,
		transactionDisplayNameColumn,
		subsidiaryColumn,
		accountIdColumn,
		inactiveColumn,
		accountTypeColumn,
		expenseAccountColumn,
		transactionDateColumn,
		netAmountColumn,
		endingBalanceColumn
	];

	return transactionQuery;
}

export function getAcctBalQueryResultSet1(options?: TranAcctBalQueryOptions): query.ResultSet {
	const transactionQuery = createAcctBalQuery(options);
	const searchResult = transactionQuery.run();
	return searchResult;
}

export function getAcctBalQueryResultSet(options?: TranAcctBalQueryOptions): ObjSql {
	try {
		const transactionQuery = createAcctBalQuery(options);
		let beginTime = new Date().getTime();
		const resultSet = transactionQuery.run();
		let endTime = new Date().getTime();
		let elapsedTime = endTime - beginTime;

		let records = resultSet.asMappedResults();

		let objSQL = {
			recordCount: records.length,
			time: elapsedTime,
			records: records,
			resultSet: resultSet
		}
		return objSQL;
	} catch (e) {
		log.error('Error getting AcctBalQueryResultSet - ' + e.name, e.message);
		log.error('Error getting AcctBalQueryResultSet - ' + e.name + ' stacktrace:', e.stack);
		return e + e.stack;
	}
}




export function getVendorList(asLinks : boolean = false): ObjSql {
	let stLogTitle = 'getVendorList';
	log.debug(`${stLogTitle}:asLinks`, asLinks);

	// @ts-ignore
	let qryList = getResultByQueryId('custdataset_avc_ds_vendorloc');
	let qryVendorList = processList(qryList, asLinks);

	return qryVendorList;
} // GETVENDORLIST


// @ts-ignore
export function getOwnerList(asLinks? : boolean = false): ObjSql {
	let stLogTitle = 'getOwnerList';
	log.debug(`${stLogTitle}:asLinks`, asLinks);

	// @ts-ignore
	let qryList = getResultByQueryId('custdataset_avc_ds_vendorloc_owner');
	let qryOwnerList = processList(qryList, asLinks);

	return qryOwnerList;
}

// @ts-ignore
export function getSignerList(asLinks? : boolean = false): ObjSql {
	let stLogTitle = 'getSignerList';
	log.debug(`${stLogTitle}:asLinks`, asLinks);

	// @ts-ignore
	let qryList = getResultByQueryId('custdataset_avc_ds_vendorloc_signer');
	let qrySignerList = processList(qryList, asLinks);

	return qrySignerList;
}

// @ts-ignore
export function processList(sqlList : ObjSql, asLinks : boolean = false): ObjSql {
	let stLogTitle = 'processList';
	log.debug(`${stLogTitle}:asLinks`, asLinks);

	let rSet = sqlList.resultSet;
	let recs = sqlList.records;
	// Loop thru each result in resultSet.results and Fill as needed
	// NOTE: We MUST pass in the Index since assigning to the passed variable will NOT work, we MUST assign to qryVendorList...
	rSet.results.forEach( (result, indexR) => {
		let values = result.values
		let rec = recs[indexR];

		values.forEach( (value, indexV) => {
			let vType = rSet.types[indexV];
			let col = rSet.columns[indexV];
			let colRaw = JSON.parse(JSON.stringify(col));
			let cAlias = col.alias;
			let cFieldId = colRaw.fieldId; // This is necessary since NetSuite HIDES the fieldId and ONLY returns the alias!
			log.audit(`${stLogTitle}:columns[${indexV}]:`, JSON.stringify(rSet.columns[indexV]));

			// Fix Values if this field is a Token field (begin/ends with [])
			if ((value || '').toString().startsWith('[') && (value || '').toString().endsWith(']')) {
				// Token String - fill with function result
				log.debug(`${stLogTitle}:value1`, `${indexR}|${value}`);
				let newValue = getTokenValue(value, asLinks);
				//value = "FILLED"; // this will NOT work
				rSet.results[indexR].values[indexV] = newValue;
			}

			// Fix Values based upon Column Alias
			log.debug(`${stLogTitle}:switch(cAlias)`, cAlias);
			switch (cAlias) {
				case 'companyname':
					// Only update if asLinks = True
					if (asLinks) {
						let sCompany = <string>values[1];
						let iCompanyId = <number>values[0];
						let newValue = getCompanyUrl(sCompany, iCompanyId);
						rSet.results[indexR].values[indexV] = newValue;
					}
					break;
			}

			// Fix Values based upon Column FieldId
			log.debug(`${stLogTitle}:switch(cFieldId)`, cFieldId);
			switch (cFieldId) {
				case 'vendor.custentity_avc_locid.name':
					// Only update if asLinks = True
					if (asLinks) {
						let sLocation = <string>value;
						let iLocId = <number>rec.id_1; // id_1 in this list holds this. If you change the Dataset, this MIGHT change!
						let newValue = getLocationUrl(sLocation, iLocId);
						rSet.results[indexR].values[indexV] = newValue;
					}
					break;
			}

			// Fix Values based upon Value Type
			log.debug(`${stLogTitle}:switch(vType)`, vType);
			switch (vType) {
				case 'PERCENT':
					let percent = <number>value;
					const displayPercent = `${(percent * 100).toFixed(2)}%`;
					rSet.results[indexR].values[indexV] = displayPercent;
					break;
				case 'CURRENCY':
					let currency = <number>value;
					//const displayCurrency = currency.toLocaleString("en-US", { style: "currency", currency: "USD"});
					log.audit(`${stLogTitle}:Format Currency (r:${indexR} | v:${indexV})`, `before: ${currency}`);
					const displayCurrency = formatToCurrency(currency);
					rSet.results[indexR].values[indexV] = displayCurrency;
					log.audit(`${stLogTitle}:Format Currency (r:${indexR} | v:${indexV})`, `before: ${currency}, after:${displayCurrency}`);
					break;
			}
		})
	});
	// Now that we have updated the ResultSet, we need to update the Mapped object ** NOTE: This does NOT work ** - it leaves
	//  the records with the OLD versions. Not sure if the asMapped() is cached or what.
	let records = sqlList.resultSet.asMappedResults();
	log.debug(`${stLogTitle}:rSet.records`, JSON.stringify(records));
	sqlList.records = records;

	log.debug(`${stLogTitle}:rSet.results`, JSON.stringify(rSet.results));
	return sqlList;
}

// @ts-ignore
export function getResultFromQuery(qry: Query) : ObjSql {
	try {
		let stLogTitle = 'getResultFromQuery';
		log.debug(`${stLogTitle}:qry`, JSON.stringify(qry));
		log.audit(`${stLogTitle}:qry.columns`, JSON.stringify(qry.columns));
		log.audit(`${stLogTitle}:qry.condition`, JSON.stringify(qry.condition));

		let beginTime = new Date().getTime();
		let resultSet = qry.run();
		let endTime = new Date().getTime();
		let elapsedTime = endTime - beginTime;

		//let results = resultSet.results;
		log.audit(`${stLogTitle}:resultSet.columns`, JSON.stringify(resultSet.columns));
		log.audit(`${stLogTitle}:resultSet.types`, JSON.stringify(resultSet.types));
		log.debug(`${stLogTitle}:resultSet.results`, JSON.stringify(resultSet.results));
		let records = resultSet.asMappedResults();
		log.debug(`${stLogTitle}:records`, JSON.stringify(records));


		let objSQL = {
			recordCount: records.length,
			time: elapsedTime,
			records: records,
			resultSet: resultSet
		}
		return objSQL;
	} catch (e) {
		log.error('Error getting result from Query - ' + e.name, e.message);
		log.error('Error getting result from Query - ' + e.name + ' stacktrace:', e.stack);
		return e + e.stack;
	}
}

export function getResultByQueryId(qryId: string, qryCondition?: query.Condition): ObjSql {
	try {
		let stLogTitle = 'getResultByQueryId';
		log.debug(`${stLogTitle}:qryId`, qryId);
		log.debug(`${stLogTitle}:qryCondition`, qryCondition);

		let qry = query.load({
			id: qryId
		});
		logLarge(`${stLogTitle}:qry`, qry);
		logLarge(`${stLogTitle}:toSuiteQL`, qry.toSuiteQL());

		// TODO: Need to add any Joins that are required by the Conditions
		// TODO: This doesn't work. THe issue is that I need to add my Condition to a SPECIFIC Join. See WB/DS Query output
		if (qryCondition) {
			if (!qry.condition) {
				qry.condition = createQryCondition(qry, qryCondition);
				//qry.condition = qry.createCondition(qryCondition);
			} else {
				log.debug(`${stLogTitle}:qry.condition [BEFORE]`, JSON.stringify(qry.condition));
					qry.and(
						qry.condition,
						createQryCondition(qry, qryCondition)
						//qry.createCondition(qryCondition)
					);
			}
		}
		log.debug(`${stLogTitle}:qry.condition [AFTER]`, JSON.stringify(qry.condition));

		return getResultFromQuery(qry);
	} catch (e) {
		log.error('Error getting result from Query by ID - ' + e.name, e.message);
		log.error('Error getting result from Query by ID - ' + e.name + ' stacktrace:', e.stack);
		return e + e.stack;
	}
}

export function getResultFromQueryString(qrySql: string): ObjSql {
	try {
		let stLogTitle = 'getResultFromQueryString';
		log.debug(`${stLogTitle}:qrySql`, qrySql);

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
		log.error('Error getting result from Query by String - ' + e.name, e.message);
		log.error('Error getting result from Query by String - ' + e.name + ' stacktrace:', e.stack);
		return e + e.stack;
	}
}

// CONDITION FUNCTIONS

/**
 * Works the same as query.createCondition, but also adds the various autoJoins if the options.fieldid uses
 * dotted notation, as in:
 * transactionlines.accountingimpact.account.accttype
 * This will add the following autoJoins:
 *  transactionlines
 *  accoutingimpact
 *  account
 *  It will then add the Condition of accttype to the "account" Component
 *
 *  NOT USED: Amazingly, it appears I don't need this routine. It works, but I think just passing a dotted
 *  fieldid to the options of createCondition() seems to do the joining for me.
*/
export function createQryCondition(qry : query.Query, options: CreateConditionOptions | CreateConditionWithFormulaOptions) : query.Condition {
	let stLogTitle = 'createQryCondition';
	log.debug(`${stLogTitle}:options`, options);

	debugger;
	const fieldIds = options.fieldId?.split('.');
	const lastFieldId = fieldIds?.pop();

	let component: query.Query | query.Component = qry;
	if (fieldIds) {
		for (const fieldId of fieldIds) {
			try {
				component = component.autoJoin({ fieldId });
			} catch (e) {
				log.error(`Error adding autoJoin (${fieldId}) - ` + e.name, e.message);
				log.error(`Error adding autoJoin (${fieldId}) - ` + e.name + ' stacktrace:', e.stack);
			}
			log.debug(`${stLogTitle}:component`, component);
			// if (!('id' in component)) {
			// 	throw new Error('Component does not have an id property');
			// }
		}
	}

	if (!lastFieldId && !options.formula) {
		throw new Error('No fieldId or formula provided in options');
	}

	if (options.formula) {
		const condition = component.createCondition({
			formula: options.formula,
			type: options.type,
			aggregate: options.aggregate,
		});
		return condition;
	} else {
		const condition = component.createCondition({
			fieldId: lastFieldId!,
			operator: options.operator,
			values: options.values,
			type: options.type,
			aggregate: options.aggregate,
		});
		log.debug(`${stLogTitle}:condition`, condition);
		return condition;
	}

}

// TOKEN FUNCTIONS

// @ts-ignore
export function getTokenValue(strToken : any, asLinks? : boolean = false) : any {
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
			retVal = getKeyPrincipalText(id, asLinks);
			break;
		case 'getKeyPrincipalAddressText' :
			retVal = getKeyPrincipalAddressText(id);
			break;
		case 'getSignerNamesText' :
			retVal = getSignerNamesText(id, asLinks);
			break;
		default:
			retVal = 'DEFAULT';
			break;
	}

	log.debug('getTokenValue:retVal', `${retVal}`);
	return retVal;
}

// @ts-ignore
export function getKeyPrincipalText(vendId: string, asLinks? : boolean = false) {
	// Format:
	//  1. <Owner-1> (%)
	//    <custrecord_avc_o_eo_name> (if non-blank)
	//  2. <Owner-2> (%)
	//    <custrecord_avc_o_eo_name> (if non-blank)

	let stLogTitle = "getKeyPrincipalText";
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
	log.debug(`${stLogTitle}:records`, JSON.stringify(records));
	let retArr = new Array();
	let eoNames: string;
	records.forEach((rec, index) => {
		// Build Principal Name
		// https://app/common/custom/custrecordentry.nl?rectype=<rectype-id>&id=<rec-id>
		let pName = (rec.name || '').toString();
		let pNameText = '';
		if (asLinks) {
			const pNameUrl = url.resolveRecord({
				recordType: 'customrecord_avc_owner',
				recordId: <number>rec.custrecord_avc_lo_ownerid,
				isEditMode: false
			});
			log.debug(`${stLogTitle}:pNameUrl`, pNameUrl);
			pNameText = `<a target="_blank" href="${pNameUrl}">${pName}</a>`
		} else {
			pNameText = pName;
		}
		// Build Percent Ownership
		//const displayPercent = (percent: number = <number>rec.custrecord_avc_lo_ownpc) => `${(percent * 100).toFixed(2)}%`;
		let percent = <number>rec.custrecord_avc_lo_ownpc;
		const displayPercent = `${(percent * 100).toFixed(2)}%`;
		//const eoNames = (names:string = <string>rec.custrecord_avc_o_eo_name) => (names || '').toString().length > 0 ? String.fromCharCode(10) + names : '';
		log.debug(`${stLogTitle}:rec.custrecord_avc_o_eo_name`, rec.custrecord_avc_o_eo_name);
		if ((rec.custrecord_avc_o_eo_name || '').toString().length > 0) {
			eoNames = String.fromCharCode(10) + rec.custrecord_avc_o_eo_name;
		} else {
			eoNames = '';
		}
		retArr.push(`${index+1}. ${pNameText} (${displayPercent})${eoNames}`);
	});
	let retVal = retArr.join(String.fromCharCode(10));
	log.debug(`${stLogTitle}:retVal`, retVal);
	return retVal;
	//return `filled-gKPT:${vendId}`
}

// @ts-ignore
export function getKeyPrincipalAddressText(vendId: string) {
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
		let pAddr = (rec.custrecord_avc_o_paddr || '').toString().length > 0 ? rec.custrecord_avc_o_paddr : 'Add Link to Principal Here';

		log.debug('getKeyPrincipalAddressText:rec.custrecord_avc_o_eo_name', rec.custrecord_avc_o_eo_name);
		if ((rec.custrecord_avc_o_eo_addr || '').toString().length > 0) {
			eoAddrs = String.fromCharCode(10) + rec.custrecord_avc_o_eo_addr;
		} else {
			eoAddrs = '';
		}
		retArr.push(`${index+1}. ${pAddr}${eoAddrs}`);
	});
	let retVal = retArr.join(String.fromCharCode(10));
	log.debug('getKeyPrincipalAddressText:retVal', retVal);
	return retVal;
	//return `filled-gKPAT:${vendId}`
}

// @ts-ignore
export function getSignerNamesText(vendId: string, asLinks? : boolean = false) {
	// Format:
	//  <signer1>
	//  <signer2>...
	let stLogTitle = "getSignerNamesText";
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
	log.debug(`${stLogTitle}:records`, JSON.stringify(records));
	let retArr = new Array();
	records.forEach((rec) => {
		// Build Signer Name
		// https://app/common/custom/custrecordentry.nl?rectype=<rectype-id>&id=<rec-id>
		let sName = (rec.name || '').toString();
		let sNameText = '';
		if (asLinks) {
			const sNameUrl = url.resolveRecord({
				recordType: 'customrecord_avc_owner',
				recordId: <number>rec.custrecord_avc_ls_ownerid,
				isEditMode: false
			});
			log.debug(`${stLogTitle}:sNameUrl`, sNameUrl);
			sNameText = `<a target="_blank" href="${sNameUrl}">${sName}</a>`
		} else {
			sNameText = sName;
		}
		retArr.push(sNameText);
	});
	let retVal = retArr.join(String.fromCharCode(10));
	return retVal;
	//return `filled-gSNT:${vendId}`
}

export function getCompanyUrl(sCompany : string, iCompanyId : number) : string {
	let stLogTitle = 'getCompanyUrl';
	log.debug(`${stLogTitle} (sCompany, iCompanyId)`, `${sCompany}, ${iCompanyId}`);

	const sCompanyUrl = url.resolveRecord({
		recordType: Type.VENDOR,
		recordId: iCompanyId,
		isEditMode: false
	});
	log.debug(`${stLogTitle}:sCompanyUrl`, sCompanyUrl);
	let sCompanyUrlText = `<a target="_blank" href="${sCompanyUrl}">${sCompany}</a>`
	return sCompanyUrlText
}

export function getLocationUrl(sLocation : string, iLocId : number) : string {
	let stLogTitle = "getLocationUrl";
	log.debug(`${stLogTitle} (sLocation, iLocId)`, `${sLocation}, ${iLocId}`);

	const sLocationUrl = url.resolveRecord({
		recordType: Type.LOCATION,
		recordId: iLocId,
		isEditMode: false
	});
	log.debug(`${stLogTitle}:sCompanyUrl`, sLocationUrl);
	let sLocationUrlText = `<a target="_blank" href="${sLocationUrl}">${sLocation}</a>`
	return sLocationUrlText

}

// --------------------------------------------------------------------------
// CSV File Generation
// --------------------------------------------------------------------------

export function createBcdAccountList_CSVFile(destFolderId: number) {
	let stLogTitle = 'createBcdAccountList_CSVFile';
	log.debug(stLogTitle, `destFolderId = ${destFolderId}`);

	const now = new Date();
	let csvFilename = 'BCD-AccountList-' + dateToYMD(now, '-').substr(0,10) + '.csv';
	// Get the List/Data to Process
	let vendorList = getVendorList(false);

	let csvFile = createCsvFile(destFolderId, csvFilename, vendorList);

	return csvFile;
}

export function createBcdOwnerList_CSVFile(destFolderId: number) {
	let stLogTitle = 'createBcdOwnerList_CSVFile';
	log.debug(stLogTitle, `destFolderId = ${destFolderId}`);

	const now = new Date();
	let csvFilename = 'BCD-OwnerList-' + dateToYMD(now, '-').substr(0,10) + '.csv';
	// Get the List/Data to Process
	let ownerList = getOwnerList(false);

	let csvFile = createCsvFile(destFolderId, csvFilename, ownerList);

	return csvFile;
}

export function createBcdSignerList_CSVFile(destFolderId: number) {
	let stLogTitle = 'createBcdSignerList_CSVFile';
	log.debug(stLogTitle, `destFolderId = ${destFolderId}`);

	const now = new Date();
	let csvFilename = 'BCD-SignerList-' + dateToYMD(now, '-').substr(0,10) + '.csv';
	// Get the List/Data to Process
	let signerList = getSignerList(false);

	let csvFile = createCsvFile(destFolderId, csvFilename, signerList);

	return csvFile;
}

export function createCsvFile(destFolderId : number, csvFilename : string, dataList : ObjSql) : file.File {
	let stLogTitle = 'createCsvFile';
	log.debug(`${stLogTitle}:destFolderId`, destFolderId);
	log.debug(`${stLogTitle}:csvFilename`, csvFilename);
	log.debug(`${stLogTitle}:dataList`, JSON.stringify(dataList));

	let rs = dataList.resultSet;

	//	let content = new Array();
	let csvCols = [];
	let csvText:string = '';

	// Loop thru Columns to create Headers
	log.debug(stLogTitle, `Columns: ${rs.columns.length}`);
	csvCols = [];
	rs.columns.forEach( (col, cIndex) => {
		log.audit(`${stLogTitle}:Add Header row Column`, JSON.stringify(col));
		csvCols.push(col.label);
	});
	csvText += csvCols.join(',');
	csvText += '\n';

	// Loop thru Values to add data in each row
	log.debug(stLogTitle, `Rows: ${rs.results.length}`);
	rs.results.forEach( (result, rIndex) => { // Loop thru Rows
		log.debug(`${stLogTitle}:Set Values for Row`, JSON.stringify(result));
		csvCols = [];
		result.values.forEach( (value, vIndex) => { // Loop thru Cols/Values in Row
			//let col = rs.columns[vIndex];
			let val = value?.toString() ?? '';
			val = csvEncode(val);
			csvCols.push('"' + val + '"');
		}); // Loop thru Cols in Row
		// Assign csvCols array to Text
		csvText += csvCols.join(',');
		csvText += '\n';
	}); // Loop thru Rows

	// Create the File in the Cabinet
	log.debug(`${stLogTitle}:Value of CSV Output:`, JSON.stringify(csvText));
	log.debug(`${stLogTitle}:Create the File. csvFilename:`, csvFilename);
	let csvFile = file.create({
		name: csvFilename,
		fileType: file.Type.CSV,
		contents: csvText,
		folder: destFolderId
	});
	log.debug(`${stLogTitle}:Save the File. csvFile:`, JSON.stringify(csvFile));
	let csvFileId = csvFile.save();
	// Reload file so I have all the parts I need
	csvFile = file.load( {
		id: csvFileId
	});
	log.debug(`${stLogTitle}:Saved File. csvFile:`, JSON.stringify(csvFile));

	return csvFile;
}

/*
 * We want to have a folder structure like the following:
 * File Cabinet\SuiteApps\avc.vendorloclist\<YYYY>\<ExportName>||<YYYY-MM-DDTHH:mm:ss>\
 * File Names:
 *  Account List: BCD-AccountList-YYYY-MM-DD.csv
 *  Owner List: BCD-OwnerList-YYYY-MM-DD.csv
 *  Signer List: BCD-SignerList-YYYY-MM-DD.csv
 */
export function getDestFolderId(exportName? : string) {
	let stLogTitle = 'getDestFolderId';
	log.debug(stLogTitle, `exportName = ${exportName}`);
	const now = new Date();

	exportName = (typeof exportName !== 'undefined' && exportName.length > 0) ? exportName : dateToYMDHms(now).substr(0,19);
	log.debug(stLogTitle, `exportName (new) = ${exportName}`);

	// Root\
	let sFolderPath = 'SuiteApps\\avc.vendorloclist';

	// Root\YYYY
	let dateStrY = dateToYMD(now, '').substr(0,4);
	log.debug(stLogTitle, `dateStrY = ${dateStrY}`);
	sFolderPath += '\\' + dateStrY;

	// Root\YYYY\exportName||Date
	sFolderPath += '\\' + exportName;
	log.debug(stLogTitle, `sFolderPath = ${sFolderPath}`);

	// Now get the FolderID
	let destFolderId = getFolderIdFromPath(sFolderPath);
	log.debug(stLogTitle, `destFolderId = ${destFolderId}`);

	// Delete any Files in this Folder that match destFilename
	// This isn't necessary. Turns out when I just have to CTRL-R to refresh the PDF file to re-display the New one
	//deleteFile(sFolderPath, destFilename);

	return destFolderId;
}

export function deleteFile(folderName : string, fileName : string){
	try {
		let fileObj = file.load({
			id: folderName + '/' + fileName
		});
		if (fileObj) {
			file.delete({
				id: fileObj.id
			});
		}
	}
	catch (e) {
		log.error('Error deleting file - ' + e.name, e.message);
		log.error('Error deleting file - ' + e.name + ' stacktrace:', e.stack);
	}
}

/*
 * Given a folder path like: \Name1\Name2\Name3 gets the FolderId of Name3
 * NOTE: If any of the folders do NOT exist, it will CREATE them.
 */
export function getFolderIdFromPath(sFolderPath : string) : number {
	let stLogTitle = 'getFolderIdFromPath'
	log.debug(stLogTitle, 'sFolderPath = ' + sFolderPath);

	try {
		let fldrs = sFolderPath.split("\\");
		let iParent : number;
		let currFolderId : number;
		for (let i = 0; i < fldrs.length; i++) {
			let currFolderName = fldrs[i];
			currFolderId = getFolderId(currFolderName, iParent);
			if (!currFolderId) {
				// Didn't find that folder, add it
				log.debug(stLogTitle, 'DID NOT FIND = ' + currFolderName);
				currFolderId = createFolder(currFolderName, iParent);
				iParent = currFolderId;
			} else {
				// Found folder, set that as the new Parent and move to next one.
				log.debug(stLogTitle, 'Found = ' + currFolderName);
				iParent = currFolderId;
			}
		}
		return currFolderId;
	}
	catch (e) {
		log.error(`${stLogTitle}: Error getting Folder ID from Path - ` + e.name, e.message);
		log.error(`${stLogTitle}: Error getting Folder ID from Path - ` + e.name + ' stacktrace:', e.stack);
	}
}

/*
* Creates the folder named sFolderName in the sParent location
* Returns: folderId of the newly created folder
 */
export function createFolder(sFolderName : string, iParent : number) : number {
	let stLogTitle = 'getFolderIdFromPath'
	log.debug(stLogTitle, 'sFolderName = ' + sFolderName + ', iParent = ' + iParent);
	try {
		let folder = record.create({
			type: record.Type.FOLDER
		});
		folder.setValue({fieldId: 'name', value: sFolderName});
		folder.setValue({fieldId: 'parent', value: iParent});
		let folderId = folder.save();
		return folderId;
	}
	catch (e) {
		log.error(`${stLogTitle}: Error creating folder - ` + e.name, e.message);
		log.error(`${stLogTitle}: Error creating folder - ` + e.name + ' stacktrace:', e.stack);
	}
}

/*
 * Given a Folder Name, finds the folder with the given parent.
 * If no parent is specified, only finds folders at the Root level (those where parent = '')
 */
export function getFolderId(sFolderName : string, iParent) : number {
	iParent = typeof iParent !== 'undefined' ? iParent : 0;
	let stLogTitle = "getFolderId";
	log.debug(stLogTitle, 'sFolderName = ' + sFolderName);
	try {
		/* This works, but I am NOT checking to ensure the Folder is at the ROOT of the File Cabinet */
		/* @type search */
		let mySearch = search.create({
			type : search.Type.FOLDER,
			columns: ['internalid','parent'],
			filters: [
				['name', search.Operator.IS, sFolderName],
			]
		});
		log.debug(stLogTitle, 'Run Search = ');

		let searchResults = mySearch.run().getRange({start: 0, end: 100});
		for (let i = 0; i < searchResults.length; i++) {
			let result = searchResults[i];
			log.debug(stLogTitle, 'result = ' + JSON.stringify(result));

			let resParent = result.getValue('parent');
			log.debug(stLogTitle, 'resParent = ' + JSON.stringify(resParent));
			if (resParent == iParent) {
				let folderId = <number>result.getValue('internalid').valueOf();
				return folderId;
			}
		}
		return 0;
	}
	catch (e) {
		log.error(`${stLogTitle}: Error getting Folder from ID - ` + e.name, e.message);
		log.error(`${stLogTitle}: Error getting Folder from ID - ` + e.name + ' stacktrace:', e.stack);	}
}

//
// FILE ACCESS

export function buildFolderLink(folderId : number, folderName : string, fieldLabel: string, fieldId: string) : string {
	let stLogTitle = 'buildFolderLink'
	log.debug(stLogTitle, 'folderId = ' + folderId);
	fieldId = typeof fieldId !== 'undefined' ? fieldId : 'custpage_avc_urlfolderlink_' + folderId;

	// Now create the Link to put on the page.
	// /app/common/media/mediaitemfolders.nl?folder=<folder-id>&whence=
	let fileUrl = `/app/common/media/mediaitemfolders.nl?folder=${folderId}&whence=`;
	let fileLinkHtml = '';
	fileLinkHtml += '<div class="uir-field-wrapper">';
	fileLinkHtml += `<span id="${fieldId}fs_lbl_uir_label" class="smallgraytextnolink uir-label">`;
	fileLinkHtml += `<span id="${fieldId}_fs_lbl" class="smallgraytextnolink">`;
	fileLinkHtml += fieldLabel;
	fileLinkHtml += '</span></span>';
	fileLinkHtml += `<span class="inputreadonly"><a class="dottedlink" href="${fileUrl}" target="_blank">${folderName}</a></span>`;
	fileLinkHtml += '</div>';

	return fileLinkHtml;
}

export function buildFileLink(fileObj : file.File, fieldLabel: string, fieldId : string) : string {
	let stLogTitle = 'buildFileLink'
	log.debug(stLogTitle, 'fileObj = ' + JSON.stringify(fileObj));

	fieldId = typeof fieldId !== 'undefined' ? fieldId : 'custpage_avc_urlfilelink_' + fileObj.id;

	// Get values from fileObj
	let fileUrl:string = fileObj.url;
	// @ts-ignore
	let fileId = fileObj.id;
	// @ts-ignore
	let fileName = fileObj.name;
	let fileSizeKb = fileObj.size;

	// Now create the Link to put on the page.
	let fileLinkHtml = '';
	fileLinkHtml += '<div class="uir-field-wrapper">';
	fileLinkHtml += `<span id="${fieldId}fs_lbl_uir_label" class="smallgraytextnolink uir-label">`;
	fileLinkHtml += `<span id="${fieldId}_fs_lbl" class="smallgraytextnolink">`;
	fileLinkHtml += fieldLabel;
	fileLinkHtml += '</span></span>';
	fileLinkHtml += `<span class="inputreadonly"><a class="dottedlink" href="${fileUrl}" target="_blank">${fileName} (${fileSizeKb} KB)</a></span>`;
	fileLinkHtml += '</div>';

	return fileLinkHtml;
}

// @ts-ignore
/*
export function getFileIdFields(recordType : string, recordId) : [false | search.Result, number] {
	if (!recordType || !recordId) return [false, 0];
	let stLogTitle = 'getAttachedFileIds';
	const transactionSearchColFileName = search.createColumn({ name: 'name', join: 'file' });
	const transactionSearchColInternalId = search.createColumn({ name: 'internalid', join: 'file' });
	const transactionSearchColSizeKb = search.createColumn({ name: 'documentsize', join: 'file' });
	const transactionSearchColUrl = search.createColumn({ name: 'url', join: 'file' });
	let dsSearch = search.create({
		type : 'transaction',
		columns: [
			transactionSearchColFileName,
			transactionSearchColInternalId,
			transactionSearchColSizeKb,
			transactionSearchColUrl,
		],
		filters: [
			['mainline', search.Operator.IS, 'T'],
			'AND',
			['type', search.Operator.ANYOF, recordType],
			'AND',
			['internalid', search.Operator.ANYOF, recordId],
		],
	});

	// Get first 1 result only
	let searchResults = dsSearch.run().getRange({start: 0, end: 100});
	log.debug(stLogTitle, 'searchResults = ' + JSON.stringify(searchResults));
	if (searchResults.length >= 1) {
		let fileId = searchResults[0].getValue({name: 'internalid', join: 'file'});
		let attCount:number, objFileFields;
		if (fileId) {
			attCount = searchResults.length;
			objFileFields = searchResults[0];
			log.debug(stLogTitle, 'ObjAvcDsFields = ' + JSON.stringify(objFileFields));
		} else {
			attCount = 0;
			objFileFields = false;
		}
		return [objFileFields, attCount];
	}
	return [false, 0];
}

*/

// ----------------------
// UTILITY
export function formatToCurrency(amount : number) : string {
	amount = (typeof amount !== 'undefined' && amount !== null) ? amount : 0;
	return "$" + (amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Returns Date in the Format: YYYY-MM-DD
export function dateToYMD(usDate : Date, sDelim? : string) {
	sDelim = typeof sDelim !== 'undefined' ? sDelim : '-';
	let fmtDate = new Date(usDate.getTime() - (usDate.getTimezoneOffset() * 60000))
		.toISOString().split('T')[0];
	return fmtDate.split('-').join(sDelim);
}

// Returns Date in the Format: YYYY-MM-DDTHH:mm:ss.sssZ
// dDelim: internal delimiter between YYYY<dDelim>MM : Default: -
// jDelim: internal delimiter between <Date><jDelim><Time> : Default: T
// tDelim: internal delimiter between HH<tDelim>mm: Default: :
export function dateToYMDHms(usDate : Date, dDelim : string = '-', jDelim : string = 'T', tDelim : string = ':') {
	//dDelim = typeof dDelim !== 'undefined' ? dDelim : '-';
	//jDelim = typeof jDelim !== 'undefined' ? jDelim : 'T';
	let fmtDateTime = new Date(usDate.getTime() - (usDate.getTimezoneOffset() * 60000))
		.toISOString();
	let fmtDate = fmtDateTime.split('T')[0];
	fmtDate = fmtDate.split('-').join(dDelim);
	let fmtTime = fmtDateTime.split('T')[1];
	fmtTime = fmtTime.split(':').join(tDelim);

	return fmtDate + jDelim + fmtTime;
}

// Fix the Value for Output to CSV File
//  replace <br> with \n
export function csvEncode(val:string) : string {
	let re = /<br>/gi;
	val = val.replace(re, '\n');
	return val;
}

function splitText(text: string, maxLength: number): string[] {
	const result = [];
	let i = 0;
	while (i < text.length) {
		result.push(text.slice(i, i+ maxLength));
		i += maxLength;
	}
	return result;
}

function logLarge(title: string,  logObject: object, maxLogLength: number = 3900) {
	const logString = JSON.stringify(logObject);
	const logChunks = splitText(logString, maxLogLength);

	let iChunk = 1;
	for (const chunk of logChunks) {
		log.debug(`${title} (${iChunk}/${logChunks.length}):`, chunk);
		iChunk++;
	}
}



// --------------------------------------------------------------
// @hitc Non-Exported Interfaces - Added here so I can use them

export interface CreateConditionOptions {
	/** Field (column) id. Required if options.operator and options.values are used. */
	fieldId?: string;

	/** Use the Operator enum. */
	operator: query.Operator;

	/**
	 * Array of values to use for the condition.
	 * Required if options.fieldId and options.operator are used, and options.operator does not have a value of query.Operator.EMPTY or query.Operator.EMPTY_NOT.
	 */
	values: string | boolean | string[] | boolean[] | number[] | Date[] | RelativeDate[] | Period[]; // You wouldn't have multiple boolean values in an array, obviously. But you might specify it like: [true].

	/**
	 * If you use the options.formula parameter, use this parameter to explicitly define the formula’s return type. This value sets the Condition.type property.
	 * Use the appropriate query.ReturnType enum value to pass in your argument. This enum holds all the supported values for this parameter.
	 * Required if options.fieldId is not used.
	 */
	formula?: string;

	/** Required if options.formula is used. */
	type?: string;

	/** Aggregate function. Use the Aggregate enum. */
	aggregate?: string;
}

export interface CreateConditionWithFormulaOptions extends CreateConditionOptions {
	/** Formula */
	formula: string;
}

/** A period of time to use in query conditions. Use query.createPeriod(options) to create this object. */
export interface Period {
	/** The adjustment of the period. This property uses values from the query.PeriodAdjustment enum. */
	readonly adjustment: string;
	/** The code of the period. This property uses values from the query.PeriodCode enum. */
	readonly code: string;
	/**
	 * The type of the period. This property uses values from the query.PeriodType enum.
	 * If you create a period using query.createPeriod(options) and do not specify a value for the options.type parameter, the default value of this property is query.PeriodType.START.
	 */
	readonly type: string;
}

/**
 * Special object which can be used as a condition while querying dates
 *
 * @since 2019.1
 */
export interface RelativeDate {

	/**
	 * Start of relative date
	 * @throws {SuiteScriptError} READ_ONLY_PROPERTY when setting the property is attempted
	 *
	 * @since 2019.1
	 */
	readonly start: Object;

	/**
	 * End of relative date
	 * @throws {SuiteScriptError} READ_ONLY_PROPERTY when setting the property is attempted
	 *
	 * @since 2019.1
	 */
	readonly end: Object;

	/**
	 * Interval of relative date
	 * @throws {SuiteScriptError} READ_ONLY_PROPERTY when setting the property is attempted
	 *
	 * @since 2019.1
	 */
	readonly interval: Object;

	/**
	 * Value of relative date
	 * @throws {SuiteScriptError} READ_ONLY_PROPERTY when setting the property is attempted
	 *
	 * @since 2019.1
	 */
	readonly value: Object;

	/**
	 * Flag if this relative date represents range
	 * @throws {SuiteScriptError} READ_ONLY_PROPERTY when setting the property is attempted
	 *
	 * @since 2019.1
	 */
	readonly isRange: boolean;

	/**
	 * Id of relative date
	 * @throws {SuiteScriptError} READ_ONLY_PROPERTY when setting the property is attempted
	 *
	 * @since 2019.1
	 */
	readonly dateId: Object;

	/**
	 * Returns the object type name (query.RelativeDate)
	 *
	 * @since 2019.1
	 */
	toString(): string;

	/**
	 * get JSON format of the object
	 *
	 * @since 2019.1
	 */
	toJSON(): any;
}