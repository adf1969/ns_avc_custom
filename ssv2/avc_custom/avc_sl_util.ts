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
import {Component, FieldContext} from "N/query";
import {combineTranAcctList} from "./avc_accountbalrpt_main_sl";


// INTERFACES
export interface ObjSql {
	recordCount: number,
	time: number,
	records: Array<{ [fieldId: string]: string | boolean | number | null }>,
	resultSet?: query.ResultSet,
	columns?: query.Column[] | Column[],
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

export enum TranQueryTables {
	Transaction = 'transaction',
	TransactionLines = 'transactionlines',
	AccountingImpact = 'accountingimpact',
	Account = 'account',
}

export enum TranQueryFields {
	ACCOUNT_Id = 'account.id',
	ACCOUNT_AcctNumber = 'account.acctnumber',
	ACCOUNT_AccountSearchDisplayNameCopy = 'account.accountsearchdisplaynamecopy',
	ACCOUNT_AcctType = 'account.accttype',
	TRANSACTION_Id = 'transaction.id',
	TRANSACTION_Id_Display = 'transaction.id_display',
	TRANSACTION_Date = 'transaction.trandate',
	TRANSACTIONLINES_Subsidiary = 'transactionlines.subsidiary',
	TRANSACTIONLINES_Subsidiary_Display = 'transactionlines.subsidiary_display',
	TRANSACTIONLINES_ExpenseAccount = 'transactionlines.expenseaccount',
	TRANSACTIONLINES_ExpenseAccount_Display = 'transactionlines.expenseaccount_display',
	TRANSACTIONLINES_NetAmount = 'transactionlines.netamount',
	TRANSACTIONLINES_EndingBalance = 'transactionlines.custcol_avc_ending_bal',
	FORMULA_Internal_Ending_Bal_Diff = 'formula_int_end_bal_diff',
}

export interface CreateSortOptions {
	fieldId: string;
	ascending?: boolean;
	nullsLast?: boolean;
	caseSensitive?: boolean;
	locale?: query.SortLocale;
}

export interface  TranAcctBalQueryOptionDisplayColumns {
	 fieldId?: string; alias?: string; groupBy: boolean;
		context?: string | query.FieldContext;
		aggregate?: query.Aggregate;
		formula?: string;
		// TODO: remove the type property, I don't think it works.
		type?: query.ReturnType;
}

export interface TranAcctBalQueryOptions {
	subsidiaryId?: string;
	accttype?: string | string[];
	isinactive?: boolean;
	trandateOnOrBefore?: string;
	accountname?: string;
	endingBalanceNotEmpty?: boolean;
	filters?: Array<{ fieldId: string; operator: query.Operator; values: any[] }>;

	// displayColumns: Array<{ fieldId?: string; alias?: string; groupBy: boolean;
	// 	context?: string | query.FieldContext;
	// 	aggregate?: query.Aggregate,
	// 	formula?: string,
	// 	// TODO: remove the type property, I don't think it works.
	// 	type?: query.ReturnType,
	// }>;
	displayColumns: Array<TranAcctBalQueryOptionDisplayColumns>;
	sortOptions?: CreateSortOptions;
	// TODO: Implement resultLimit. There doesn't seem to be a way to do this with run() but perhaps with paged?
	resultLimit?: number;
}

/*
	* The order of building SQL Strings is as follows:
	*   FROM & JOINs determine & filter rows
	*   WHERE more filters on the rows
	*   GROUP BY combines those rows into groups
	*   HAVING filters groups
	*   ORDER BY arranges the remaining rows/groups
	*   LIMIT filters on the remaining rows/groups
 */
export function createAcctBalQuerySQL(options?: TranAcctBalQueryOptions): string {
	let stLogTitle = 'createAcctBalQuerySQL';
	let eOpt : EnhLogOptions = {
		function: 'createAcctBalQuerySQL',
		tags: ['AcctBal', 'Account'],
	};
	elog.debug(`options`, options, eOpt);

	// Start building the SQL query string
	let sqlQueryString = 'SELECT ';

	// Build columns based on the displayColumns option
	const columns: string[] = [];
	const groupByColumns: string[] = [];

	options.displayColumns.forEach((column, index) => {
		if (column.fieldId) {
			const [tableName, fieldName] = column.fieldId.split('.');
			const alias = column.alias ? `AS "${column.alias}"` : '';

			columns.push(`${tableName}.${fieldName} ${alias}`);

			if (column.groupBy) {
				groupByColumns.push(`${tableName}.${fieldName}`);
			}
		} else if (column.formula) {
			const alias = column.alias ? `AS "${column.alias}"` : `AS "formula_column_${index}"`;

			columns.push(`${column.formula} ${alias}`);
		} else {
			throw new Error('Invalid display column configuration');
		}
	});

	// Add columns to the SQL query string
	sqlQueryString += columns.join(', ');

	// Simple Join Syntax
	// sqlQueryString += `
  //   FROM Transaction AS T
  //   JOIN TransactionLines AS TL ON T.ID = TL.Transaction_ID
  //   JOIN AccountingImpact AS AI ON TL.ID = AI.TransactionLines_ID
  //   JOIN Account AS A ON AI.Account_ID = A.ID
  // `;

	// Complex Join Syntax
	sqlQueryString += ` FROM ${TranQueryTables.Transaction} AS T `;

	// Check if we need to join any tables
	const joinTransactionLines = options.displayColumns.some(column =>
			column.fieldId && (
				column.fieldId.startsWith(`${TranQueryTables.TransactionLines}.`) ||
				column.fieldId.startsWith(`${TranQueryTables.AccountingImpact}.`) ||
				column.fieldId.startsWith(`${TranQueryTables.Account}.`)
			)
	);

	const joinAccountingImpact = options.displayColumns.some(column =>
			column.fieldId && (
				column.fieldId.startsWith(`${TranQueryTables.AccountingImpact}.`) ||
				column.fieldId.startsWith(`${TranQueryTables.Account}.`)
			)
	);

	const joinAccount = options.displayColumns.some(column =>
		column.fieldId && column.fieldId.startsWith(`${TranQueryTables.Account}.`)
	);


	// Add join clauses if needed
	if (joinTransactionLines) {
		sqlQueryString += ` JOIN ${TranQueryTables.TransactionLines} AS TL ON T.ID = TL.Transaction_ID `;
	}

	if (joinAccountingImpact) {
		sqlQueryString += ` JOIN ${TranQueryTables.AccountingImpact} AS AI ON TL.ID = AI.TransactionLines_ID `;
	}

	if (joinAccount) {
		sqlQueryString += ` JOIN ${TranQueryTables.Account} AS A ON AI.Account_ID = A.ID `;
	}

	// Build the WHERE clause with dynamic conditions
	let conditions: string[] = [];

	if (options?.subsidiaryId) {
		const subsidiaryIds = Array.isArray(options.subsidiaryId) ? options.subsidiaryId : [options.subsidiaryId];
		conditions.push(`TL.subsidiary IN (${subsidiaryIds.join(', ')})`);
	}

	if (options?.accttype) {
		const acctTypeValues = Array.isArray(options.accttype) ? options.accttype : [options.accttype];
		conditions.push(`A.accttype IN (${acctTypeValues.map(v => `'${v}'`).join(', ')})`);
	}

	if (options?.isinactive) {
		conditions.push(`A.isinactive = ${options.isinactive}`);
	}

	if (options?.trandateOnOrBefore) {
		conditions.push(`T.trandate <= '${options.trandateOnOrBefore}'`);
	}

	if (options?.accountname) {
		conditions.push(`A.accountsearchdisplaynamecopy LIKE '%${options.accountname}%'`);
	}

	if (options?.endingBalanceNotEmpty) {
		conditions.push(`TL.custcol_avc_ending_bal IS NOT NULL`);
	}

	if (conditions.length > 0) {
		sqlQueryString += ` WHERE ${conditions.join(' AND ')} `;
	}

	// Add GROUP BY clause if there are any groupByColumns
	if (groupByColumns.length > 0) {
		sqlQueryString += ` GROUP BY ${groupByColumns.join(', ')} `;
	}

	// Add sorting options
	if (options?.sortOptions) {
		const sortField = options.sortOptions.fieldId.replace('.', '.');
		const sortOrder = options.sortOptions.ascending ? 'ASC' : 'DESC';
		sqlQueryString += ` ORDER BY ${sortField} ${sortOrder} `;
	}

	elog.debug(`sqlQueryString`, sqlQueryString, eOpt);
	return sqlQueryString;
}



export function createAcctBalQuery(options?: TranAcctBalQueryOptions): query.Query {
	let stLogTitle = 'createAcctBalQuery';
	let eOpt : EnhLogOptions = {
		function: 'createAcctBalQuery',
		tags: ['AcctBal', 'Account', 'Query'],
	};
	//elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.
	elog.debug(`options`, options, eOpt);

	const transactionQuery: query.Query = query.create({
		type: query.Type.TRANSACTION,
	});

	// JOINS ----------------------
	const transactionLinesJoin = transactionQuery.autoJoin({
		fieldId: "transactionlines",
	});

	const accountingImpactJoin = transactionLinesJoin.autoJoin({
		fieldId: "accountingimpact",
	});

	const accountJoin = accountingImpactJoin.autoJoin({
		fieldId: "account",
	});

	// CONDITIONS ----------------------
	const conditions: query.Condition[] = [];

	// TransactionLines.subsidiary
	if (options?.subsidiaryId) {
		const subsidiaryIdValues = Array.isArray(options.subsidiaryId) ? options.subsidiaryId : [options.subsidiaryId];
		const subsidiaryIdCondition = transactionLinesJoin.createCondition({
			fieldId: "subsidiary",
			operator: query.Operator.ANY_OF,
			values: subsidiaryIdValues,
		});
		conditions.push(subsidiaryIdCondition);
	}

	// Account.accttype
	if (options?.accttype) {
		const acctTypeValues = Array.isArray(options.accttype) ? options.accttype : [options.accttype];
		const acctTypeCondition = accountJoin.createCondition({
			fieldId: "accttype",
			operator: query.Operator.ANY_OF,
			values: acctTypeValues,
		});
		conditions.push(acctTypeCondition);
	}

	// Account.isinactive
	if (options?.isinactive) {
		const inactiveCondition = accountJoin.createCondition({
			fieldId: "isinactive",
			operator: query.Operator.IS,
			values: [options.isinactive],
		});
		conditions.push(inactiveCondition);
	}

	// Transaction.trandate
	if (options?.trandateOnOrBefore) {
		const dateCondition = transactionQuery.createCondition({
			fieldId: "trandate",
			operator: query.Operator.ON_OR_BEFORE,
			values: [options.trandateOnOrBefore],
		});
		conditions.push(dateCondition);
	}

	// Account.accountsearchdisplaynamecopy
	if (options?.accountname) {
		const accountNameCondition = accountJoin.createCondition({
			fieldId: "accountsearchdisplaynamecopy",
			operator: query.Operator.CONTAIN,
			values: [options.accountname],
		});
		conditions.push(accountNameCondition);
	}

	// transactionlines.custcol_avc_ending_bal !empty
	if (options?.endingBalanceNotEmpty) {
		const endingBalNotEmptyCondition = transactionLinesJoin.createCondition({
			fieldId: "custcol_avc_ending_bal",
			operator: query.Operator.EMPTY_NOT,
			values: [],
		});
		conditions.push(endingBalNotEmptyCondition);
	}

	// FILTERS ----------------------
	if (options?.filters) {
		for (const filter of options.filters) {
			let queryComponent: query.Query | query.Component;
			const [componentId = 'transaction', fieldId] = filter.fieldId.split('.');
			switch (componentId) {
				case 'transaction':
					queryComponent = transactionQuery;
					break;
				case 'transactionlines':
					queryComponent = transactionLinesJoin;
					break;
				case 'accountingimpact':
					queryComponent = accountingImpactJoin;
					break;
				case 'account':
					queryComponent = accountJoin;
					break;
				default:
					throw new Error('Invalid TextFilter option');
			}
			const filterValues = Array.isArray(filter.values) ? filter.values : [filter.values];
			const newFilter = queryComponent.createCondition({
				fieldId: fieldId,
				operator: filter.operator,
				values: filterValues,
			});

			conditions.push(newFilter);
		}
	} // FILTERS

	// Uses the Spread Operator (...) to expand "conditions" to be an array of parameters.
	if (conditions.length > 0) {
		transactionQuery.condition = transactionQuery.and(...conditions);
	}

	// COLUMNS ----------------------
	const columns: query.Column[] = [];

	for (const column of options.displayColumns) {
		let queryComponent: query.Query | query.Component;
		//const [columnId = 'transaction', fieldId] = column.fieldId.split('.');
		const [columnId = 'transaction', fieldId] = column.fieldId?.split('.') ?? [];
		elog.debug(`columnId,fieldId`, `${columnId}, ${fieldId}`, eOpt, ["detail", "column"]);
		switch (columnId) {
			case 'transaction':
				queryComponent = transactionQuery;
				break;
			case 'transactionlines':
				queryComponent = transactionLinesJoin;
				break;
			case 'accountimpact':
				queryComponent = accountingImpactJoin;
				break;
			case 'account':
				queryComponent = accountJoin;
				break;
			default:
				throw new Error('Invalid DisplayColumn option');
		}

		const newColumn = fieldId
			? queryComponent.createColumn({
				fieldId: fieldId,
				groupBy: column.groupBy,
				context: column.context,
				alias: column.alias ?? column.fieldId,
				aggregate: column.aggregate,
			})
			: queryComponent.createColumn({
				formula: column.formula,
				// TODO: remove the type property, I don't think it works.
				type: column.type ?? query.ReturnType.STRING,
				groupBy: column.groupBy,
				alias: column.alias,
			});

		elog.debug(`Push Column: ${column.fieldId}`, JSON.stringify(newColumn), eOpt, ["detail", "column"]);
		columns.push(newColumn);
	} // Dislay Columns
	transactionQuery.columns = columns;

  // SORTING ----------------------
	if (options?.sortOptions) {
		let sortComponent: query.Query | query.Component;
		const aliasId = options.sortOptions.fieldId;
		const [componentId = 'transaction', fieldId] = options.sortOptions.fieldId.split('.');
		switch (componentId) {
			case 'transaction':
				sortComponent = transactionQuery;
				break;
			case 'transactionlines':
				sortComponent = transactionLinesJoin;
				break;
			case 'accountingimpact':
				sortComponent = accountingImpactJoin;
				break;
			case 'account':
				sortComponent = accountJoin;
				break;
			default:
				throw new Error('Invalid sortOptions fieldId');
		}

		//let sortColumn = transactionQuery.columns.find(column => column.fieldId === fieldId);
		let sortColumn = transactionQuery.columns.find(column => column.alias === aliasId);
		elog.debug(`sortColumn`, JSON.stringify(sortColumn), eOpt, ["detail", "column", "sort"]);

		if (!sortColumn) {
			elog.debug(`sortColumn not found, creating for fieldid:`, fieldId, eOpt, ["detail", "column", "sort"]);
			sortColumn = sortComponent.createColumn({
				fieldId: fieldId,
			});
			elog.debug(`sortColumn (new)`, JSON.stringify(sortColumn), eOpt, ["detail", "column", "sort"]);
		}

		//log.debug(`${stLogTitle}:column[6]`, JSON.stringify(transactionQuery.columns[8]));
		const newSort = sortComponent.createSort({
			column: sortColumn,
			//column: transactionQuery.columns[6],
			ascending: options.sortOptions.ascending,
			nullsLast: options.sortOptions.nullsLast,
			caseSensitive: options.sortOptions.caseSensitive,
			locale: options.sortOptions.locale,
		});

		transactionQuery.sort = [newSort];
	} // SORTING

	//log.debug(`${stLogTitle}:transactionQuery`, JSON.stringify(transactionQuery));
	elog.debug(`transactionQuery`, transactionQuery, eOpt)
	return transactionQuery;
}



export function getAcctBalQueryResultSet(options?: TranAcctBalQueryOptions): ObjSql {
	let eOpt : EnhLogOptions = {
		function: 'getAcctBalQueryResultSet',
		tags: ['AcctBal', 'Account', 'Query'],
	};
	//elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.
	elog.debug(`options`, options, eOpt);

	try {
		const transactionQuery = createAcctBalQuery(options);
		elog.debug(`transactionQuery`, transactionQuery, eOpt);
		let beginTime = new Date().getTime();
		let resultSet : query.ResultSet;
		resultSet = transactionQuery.run();
		let endTime = new Date().getTime();
		let elapsedTime = endTime - beginTime;

		let limitedResultSet : query.ResultSet;
		if (options?.resultLimit) {
			elog.debug(`resultLimit Specified. Slicing to resultLimit = `, options.resultLimit, {...eOpt, debug: false} );
			const results = Array.from(resultSet.results);
			const mappedResults = Array.from(resultSet.asMappedResults());
			limitedResultSet = {
				...resultSet,
				results: options?.resultLimit ? results.slice(0, options.resultLimit) : results,
				asMappedResults: function() {
					return options?.resultLimit ? mappedResults.slice(0, options.resultLimit) : mappedResults;
				},
			};
		} else {
			elog.debug(`resultLimit NOT Specified. Returning all Records. Length = `, resultSet.results.length, {...eOpt, debug: false} );
			limitedResultSet = resultSet;
		}

		let records = limitedResultSet.asMappedResults();

		// Combine resultSet.columns & types so each column has the Type included as "type" field
		// - This doesn't work, since the Column.type property is READONLY! Have to create ALL NEW Columns!
		// const columnsExt = resultSet.columns.map((column, index) => ({
		// 	...column,
		// 	type: resultSet.types[index],
		// 	type2: resultSet.types[index],
		// }));
		// log.debug(`${stLogTitle}:resultSet.columns`, JSON.stringify(resultSet.columns));
		// log.debug(`${stLogTitle}:resultSet.types`, JSON.stringify(resultSet.types));
		// log.debug(`${stLogTitle}:columnsExt`, JSON.stringify(columnsExt));

		const columnsExt = combineColumnsAndTypes(limitedResultSet.columns, limitedResultSet.types);
		elog.debug(`columnsExt`, JSON.stringify(columnsExt), eOpt);

		let objSQL = {
			recordCount: records.length,
			time: elapsedTime,
			records: records,
			resultSet: limitedResultSet,
			columns: columnsExt,
		}
		elog.debug(`objSql`, objSQL, eOpt, ["detail"]);

		return objSQL;
	} catch (e) {
		elog.error(`Error getting AcctBalQueryResultSet - ` + e.name, e.message, eOpt);
		elog.error(`Error getting AcctBalQueryResultSet - ` + e.name + ' stacktrace:', e.stack, eOpt);
		return e + e.stack;
	}

}

/*
* processTranList: Processes a Transaction List and formats for Display by doing the following:
	* Hiding columns that we don't need
  * Setting the Label for Columns correctly
  * If asLinks = True
	  * Replace the Subsidiary text with a Link to the Subsidiary Record (if asLinks = True)
	  * Replace the Acct# with a link to a Register View of the Account
	  * Replace the Bill Name with a link to the Bill (if a Bill exists)
  * Update the formula_int_end_bal_diff field with difference between the Internal and Ending Balance (if exists)
  * By Type, setting the value so that it matches the return type
*/
export function processTranList(sqlList : ObjSql, asLinks : boolean = false): ObjSql {
	let eOpt : EnhLogOptions = {
		function: 'processTranList',
		tags: ['detail']
	};
	//elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.

	//log.debug(`${stLogTitle}:asLinks`, asLinks);
	elog.debug(`asLinks`, asLinks, eOpt);
	//elog.debug('','DETAIL2', {...eOpt, tags:['detail2']});


	// Set the Columns that I want to display
	setColumnValueByAlias(sqlList.columns, TranQueryFields.ACCOUNT_Id, "type", "HIDDEN");
	setColumnValueByAlias(sqlList.columns, TranQueryFields.TRANSACTIONLINES_Subsidiary, "type", "HIDDEN");
	setColumnValueByAlias(sqlList.columns, TranQueryFields.TRANSACTIONLINES_Subsidiary_Display, [
		{property: "label", value: "Subsidiary"},
	]);
	setColumnValueByAlias(sqlList.columns, TranQueryFields.ACCOUNT_AcctNumber, "type", "HIDDEN");
	setColumnValueByAlias(sqlList.columns, TranQueryFields.ACCOUNT_AccountSearchDisplayNameCopy, "type", "HIDDEN");
	setColumnValueByAlias(sqlList.columns, TranQueryFields.TRANSACTIONLINES_ExpenseAccount, "type", "HIDDEN");
	setColumnValueByAlias(sqlList.columns, TranQueryFields.TRANSACTIONLINES_ExpenseAccount_Display, [
		{property: "label", value: "Account (Register View)"},
	]);
	setColumnValueByAlias(sqlList.columns, TranQueryFields.ACCOUNT_AcctType, "type", "HIDDEN");
	setColumnValueByAlias(sqlList.columns, TranQueryFields.TRANSACTIONLINES_NetAmount, [
		{property: "label", value: "Internal Balance"},
		{property: "type", value: ReturnType.CURRENCY},
	]);
	setColumnValueByAlias(sqlList.columns, TranQueryFields.TRANSACTION_Id, "type", "HIDDEN");
	setColumnValueByAlias(sqlList.columns, TranQueryFields.TRANSACTION_Id_Display, [
		{property: "label", value: "End. Bal / Latest Bill"},
	]);
	setColumnValueByAlias(sqlList.columns, TranQueryFields.TRANSACTIONLINES_EndingBalance, [
		{property: "label", value: "Ending Balance"},
		{property: "type", value: ReturnType.CURRENCY},
	]);
	setColumnValueByAlias(sqlList.columns, TranQueryFields.TRANSACTION_Date, [
		{property: "label", value: "End. Bal / Latest Bill Date"},
		{property: "type", value: ReturnType.DATE},
	]);
	setColumnValueByAlias(sqlList.columns, TranQueryFields.FORMULA_Internal_Ending_Bal_Diff, [
		{property: "label", value: "Ending - Internal Bal Difference"},
		{property: "type", value: ReturnType.CURRENCY},
	]);

	// Move Internal Balance to right BEFORE Ending Balance
	const colAliasesBefore = sqlList.columns.map((column) => column.alias);
	//log.debug(`${stLogTitle}:colAliasesBefore`, colAliasesBefore);
	elog.debug(`colAliasesBefore`, colAliasesBefore, eOpt);
	moveColumn(sqlList.columns, TranQueryFields.TRANSACTIONLINES_NetAmount, TranQueryFields.TRANSACTIONLINES_EndingBalance, "before");
	const colAliasesAfter = sqlList.columns.map((column) => column.alias);
	//log.debug(`${stLogTitle}:colAliasesAfter`, colAliasesAfter);
	elog.debug(`colAliasesAfter`, colAliasesAfter, eOpt);

	// Loop thru Records
	let recs = sqlList.records;
	let cols = sqlList.columns;
	recs.forEach((rec, rIndex) => {
		// Loop thru Columns - Set Values
		cols.forEach((col, cIndex) => {
			let cAlias = col.alias;
			// Get the Value from the rec object
			let cValue = rec[cAlias] ?? '';

			// Fix Values based upon alias
			switch (cAlias) {
				case TranQueryFields.TRANSACTIONLINES_NetAmount:
					// Reverse the value since this is a Liability acct, it needs to be inverted
					rec[cAlias] = -Number(cValue);
					break;
			}

			// Fix Values if this field is a Token field (begin/ends with [])
			if ((cValue || '').toString().startsWith('[') && (cValue || '').toString().endsWith(']')) {
				// Token String - fill with function result
				//log.debug(`${stLogTitle}:cValue`, `${rIndex}|${cValue}`);
				elog.debug(`cValue`, `${rIndex}|${cValue}`, eOpt);
				let newValue = getTokenValue(cValue, rec, asLinks);
				//value = "FILLED"; // this will NOT work
				//rSet.results[indexR].values[indexV] = newValue;
				rec[cAlias] = newValue;
			}
		}); // Loop thru cols.forEach() | for Values


		// Loop thru Columns - Set Display
		cols.forEach((col, cIndex) => {
			let cAlias = col.alias;

			// Get the Value from the rec object
			let cValue = rec[cAlias] ?? '';

			// Fix Values based upon Column alias
			//log.debug(`${stLogTitle}:switch(cAlias)`, cAlias);
			elog.debug(`switch(cAlias)`, cAlias, eOpt);
			switch (cAlias) {
				case 'companyname':
					// Only update if asLinks = True
					if (asLinks) {
						// let sCompany = <string>values[1];
						// let iCompanyId = <number>values[0];
						// let newValue = getCompanyUrl(sCompany, iCompanyId);
						// rSet.results[indexR].values[indexV] = newValue;
					}
					break;

				case TranQueryFields.TRANSACTIONLINES_Subsidiary_Display:
					if ((asLinks) && cValue) {
						let sSubId = Number(rec[TranQueryFields.TRANSACTIONLINES_Subsidiary]);
						let sSubsidiaryUrl = getSubsidiaryUrl(cValue.toString(), sSubId)
						rec[cAlias] = sSubsidiaryUrl;
					}
					break;

				case TranQueryFields.TRANSACTIONLINES_ExpenseAccount_Display:
					if ((asLinks) && cValue) {
						let sAccountId = Number(rec[TranQueryFields.TRANSACTIONLINES_ExpenseAccount]);
						let sAccountRegUrl = getAccountRegisterUrl(cValue.toString(), sAccountId)
						rec[cAlias] = sAccountRegUrl;
					}
					break;

				case TranQueryFields.TRANSACTION_Id_Display:
					if ((asLinks) && cValue) {
						let sTranId = Number(rec[TranQueryFields.TRANSACTION_Id]);
						let sTranUrl = getBillUrl(cValue.toString(), sTranId)
						rec[cAlias] = sTranUrl;
					}
					break;
			}

			// Fix Values based upon Column fieldId
			let cFieldId = col.fieldId;
			//log.debug(`${stLogTitle}:switch(cFieldId)`, cFieldId);
			elog.debug(`switch(cFieldId)`, cFieldId, eOpt);
			switch (cFieldId) {
				case 'vendor.custentity_avc_locid.name':
					// Only update if asLinks = True
					if (asLinks) {
						// let sLocation = <string>value;
						// let iLocId = <number>rec.id_1; // id_1 in this list holds this. If you change the Dataset, this MIGHT change!
						// let newValue = getLocationUrl(sLocation, iLocId);
						// rSet.results[indexR].values[indexV] = newValue;
					}
					break;
			}
			// Fix Values based upon Column type
			let cType = col.type;
			//log.debug(`${stLogTitle}:switch(cType)`, cType);
			elog.debug(`switch(cType)`, cType, eOpt);
			switch (cType) {
				case 'PERCENT':
					let percent = <number>cValue;
					const displayPercent = `${(percent * 100).toFixed(2)}%`;
					//rSet.results[indexR].values[indexV] = displayPercent;
					rec[cAlias] = displayPercent;
					break;
				case 'CURRENCY':
					let currency = <number>cValue;
					//const displayCurrency = currency.toLocaleString("en-US", { style: "currency", currency: "USD"});
					//log.audit(`${stLogTitle}:Format Currency (r:${rIndex} | v:${cIndex})`, `before: ${currency}`);
					elog.debug(`Format Currency (r:${rIndex} | v:${cIndex})`, `before: ${currency}`, eOpt);
					const displayCurrency = formatToCurrency(currency, false);
					//rSet.results[indexR].values[indexV] = displayCurrency;
					rec[cAlias] = displayCurrency;
					//log.audit(`${stLogTitle}:Format Currency (r:${rIndex} | v:${cIndex})`, `before: ${currency}, after:${displayCurrency}`);
					elog.debug(`Format Currency (r:${rIndex} | v:${cIndex})`, `before: ${currency}, after:${displayCurrency}`, eOpt);
					break;
			}

		}); // Loop thru cols.forEach() | for Display

	}); // Loop thru recs.forEach()

	return sqlList;

} // processTranList


/*
 * Combine 2 arrays of Columns into 1 array of Columns where there are no duplicates, based upon the alias field
*/
export function combineColumns(columns1: query.Column[] | Column[], columns2: query.Column[] | Column[]): Column[] {
	let eOpt : EnhLogOptions = {
		function: 'combineColumns',
		tags: ['detail']
	};
	//elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.
	elog.debug("columns1", columns1, eOpt);
	elog.debug("columns2", columns2, eOpt);

	// Create a new array that contains all the columns in columns1
	const combinedColumns: Column[] = [...columns1];

	// Search for any column in column2, if it doesn't exist, add it to the combinedColumns array.
	for (const column2 of columns2) {
		const existingColumn = combinedColumns.find((column1) => column1.alias === column2.alias);

		if (!existingColumn) {
			combinedColumns.push(column2);
		}
	}

	// Update the aliasId property for all columns in combinedColumns
	for (const column of combinedColumns) {
		if (column.aliasId === undefined) {
			column.aliasId = column.alias.replace(/\./g, "_");
		}
	}

	// Return the array of combinedColumns
	elog.debug("combinedColumns", combinedColumns, eOpt);
	return combinedColumns;
}

export function moveColumn1(columns: query.Column[] | Column[], columnToMoveAlias: string, locationAlias: string, position: 'before' | 'after'): void {
	const columnToMove = columns.find((c) => c.alias === columnToMoveAlias);
	const locationColumn = columns.find((c) => c.alias === locationAlias);

	if (columnToMove && locationColumn) {
		const index = columns.indexOf(locationColumn);
		if (position === 'before') {
			columns.splice(index, 0, columnToMove);
			columns.splice(columns.indexOf(columnToMove) + 1, 1);
		} else {
			columns.splice(index + 1, 0, columnToMove);
			columns.splice(columns.indexOf(columnToMove), 1);
		}
	}
}

function moveColumn(columns: (query.Column[] | Column[]), columnToMoveAlias: string, locationAlias: string, position: 'before' | 'after'): void {
	const column = columns.find((c) => c.alias === columnToMoveAlias);
	if (!column) {
		elog.error('moveColumn', `Column with alias "${columnToMoveAlias}" not found.`,
			{function: 'onRequestPost',
				tags: ['Request', 'Post'],});
		return;
	}

	const locationColumn = columns.find((c) => c.alias === locationAlias);
	if (!locationColumn) {
		elog.error('moveColumn', `Column with alias "${locationAlias}" not found.`,
			{function: 'onRequestPost',
				tags: ['Request', 'Post'],});
		return;
	}

	const currentIndex = columns.indexOf(column);
	const locationIndex = columns.indexOf(locationColumn);

	let targetIndex, resultIndex;
	if (position === 'before') {
		targetIndex = locationIndex;
		resultIndex = targetIndex - 1;
		if (currentIndex === resultIndex) {
			// Column is already in the desired position, nothing to do
			return;
		}
		targetIndex = (currentIndex < locationIndex) ? targetIndex-1 : targetIndex;
	} else {
		targetIndex = locationIndex + 1;
		resultIndex = targetIndex;
		if (currentIndex === resultIndex) {
			// Column is already in the desired position, nothing to do
			return;
		}
	}

	// Remove the column from the current position - this ensures that any adds go where they are SUPPOSED to go
	columns.splice(currentIndex, 1);
	// Insert the column at the target position
	columns.splice(targetIndex, 0, column);
	return;
}

// export function setColumnValueByAlias(columns: Column[], alias: string, property: string, value: any): void {
// 	const matchingColumn = columns.find((c) => c.alias === alias);
// 	if (matchingColumn) {
// 		matchingColumn[property] = value;
// 	}
// }

export function setColumnValueByAlias(columns: Column[], alias: string, properties: { property: string, value: any }[]): void;
export function setColumnValueByAlias(columns: Column[], alias: string, property: string, value: any): void;
export function setColumnValueByAlias(columns: any[], alias: string, arg2: any, arg3?: any): void {
	const matchingColumn = columns.find((c) => c.alias === alias);
	if (matchingColumn) {
		if (typeof arg3 === 'undefined') {
			// handle case where we were passed an array of properties to set
			const properties = arg2 as { property: string, value: any }[];
			for (const { property, value } of properties) {
				matchingColumn[property] = value;
			}
		} else {
			// handle case where we were passed a single property and value to set
			const property = arg2 as string;
			const value = arg3;
			matchingColumn[property] = value;
		}
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
				let newValue = getTokenValue(value, {}, asLinks);
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
} // processList


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
export function getTokenValue(strToken : any, rec?: {[p:string] : string | number | boolean}, asLinks? : boolean = false) : any {
	let eOpt : EnhLogOptions = {
		function: 'getTokenValue',
		tags: ['Token'],
	};
	// Ensure strToken is a String
	let str = (strToken || '').toString();

	// Remove the first and last brackets. Tokens look like this: "[function,arg]"
	str = str.slice(1,-1);

	// Get the Function to Call & Args
	let [fName, id] = str.split(',');
	elog.debug('fName,id', `${fName},${id}`, eOpt);

	let retVal = '';
	switch (fName) {
		case TranQueryFields.FORMULA_Internal_Ending_Bal_Diff:
			// Delta/Diff Value = rec.EndingBal - rec.InternalBal (if exists)
			//if (TranQueryFields.TRANSACTIONLINES_EndingBalance in rec) {
			if (rec[TranQueryFields.TRANSACTIONLINES_EndingBalance] != null) {
				let internalBal = Number(rec[TranQueryFields.TRANSACTIONLINES_NetAmount] ?? 0);
				let endingBal = Number(rec[TranQueryFields.TRANSACTIONLINES_EndingBalance] ?? 0);
				let deltaBal = endingBal - internalBal;
				retVal = deltaBal.toString();
			} else {
				// Set field value to ' '
				retVal = ' ';
			}
			break;
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

	elog.debug('retVal', `${retVal}`, eOpt);
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

export function getSubsidiaryUrl(urlText : string, itemId : number) : string {
	let stLogTitle = "getSubsidiaryUrl";
	let eOpt : EnhLogOptions = {
		function: 'getSubsidiaryUrl',
		tags: ['Subsidiary', 'Url'],
	};
	elog.debug(`${stLogTitle} (urlText, itemId)`, `${urlText}, ${itemId}`, eOpt, "detail");

	const sItemUrl = url.resolveRecord({
		recordType: Type.SUBSIDIARY,
		recordId: itemId,
		isEditMode: false
	});
	elog.debug(`${stLogTitle}:sItemUrl`, sItemUrl, eOpt, "detail");
	let sItemText = `<a target="_blank" href="${sItemUrl}">${urlText}</a>`
	return sItemText
}



export function getAccountRegisterUrl(urlText : string, itemId : number) : string {
	let stLogTitle = "getAccountRegisterUrl";
	let eOpt : EnhLogOptions = {
		function: 'getAccountRegisterUrl',
		tags: ['Account', 'Url'],
	};
	elog.debug(`${stLogTitle} (urlText, itemId)`, `${urlText}, ${itemId}`, eOpt, "detail");

	const sItemUrl = `/app/reporting/reportrunner.nl?acctid=${itemId}&reload=T&reporttype=REGISTER`;

	elog.debug(`${stLogTitle}:sItemUrl`, sItemUrl, eOpt, "detail");
	let sItemText = `<a target="_blank" href="${sItemUrl}">${urlText}</a>`
	return sItemText
}

export function getBillUrl(urlText : string, itemId : number) : string {
	let stLogTitle = "getBillUrl";
	let eOpt : EnhLogOptions = {
		function: 'getBillUrl',
		tags: ['Bill', 'Url'],
	};
	elog.debug(`${stLogTitle} (urlText, itemId)`, `${urlText}, ${itemId}`, eOpt, "detail");

	const sItemUrl = url.resolveRecord({
		recordType: Type.VENDOR_BILL,
		recordId: itemId,
		isEditMode: false
	});
	elog.debug(`${stLogTitle}:sItemUrl`, sItemUrl, eOpt, "detail");
	let sItemText = `<a target="_blank" href="${sItemUrl}">${urlText}</a>`
	return sItemText
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
export function formatToCurrency(amount : number, showZeros?: boolean) : string {
	amount = (typeof amount !== 'undefined' && amount !== null) ? amount : 0;
	if ((!showZeros) && (amount == 0)) {
		return ' ';
	}
	return "$" + Number(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
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


// LOGGING ----------------------------------------------------------------
/*
export var gLogFunctions: string[] = [];
export var gLogTags: string[] = [];
*/

/*
 * Breaks a Large object into smaller chunks < the maxLogLength (3999 at this time).
 * It outputs them in REVERSE order so they are easier to cut/paste, but still #s them in order
 */
export function logLarge(title: string,  logObject: object, maxLogLength: number = 3900) {
	const logString = JSON.stringify(logObject);
	const logChunks = splitText(logString, maxLogLength);

	let iChunk = logChunks.length;
	for (const chunk of logChunks.reverse()) {
		log.debug(`${title} (${iChunk}/${logChunks.length}):`, chunk);
		iChunk--;
	}
}


export interface LogOptions {
	/** String to appear in the Title column on the Execution Log tab of the script deployment. Maximum length is 99 characters. */
	title?: string;
	/**
	 * You can pass any value for this parameter.
	 * If the value is a JavaScript object type, JSON.stringify(obj) is called on the object before displaying the value.
	 * NetSuite truncates any resulting string over 3999 characters.
	 */
	details?: any;
}

export interface LogFunction {
	(title: string, details: any): void;
	(options: LogOptions): void;
}

export interface EnhLogOptions extends LogOptions {
	function: string;
	tags: string[];
	breakLarge?: boolean;
	outputTags?: boolean;

	debug?: boolean;
}

/*
interface eLog {
	(title: string, details: any, options?: EnhLogOptions): void;
	(options: EnhLogOptions): void;
}

export var logDebugV1: eLog = (arg1: any, arg2?: any, arg3?: EnhLogOptions) => {
	let options: EnhLogOptions;

	if (typeof arg1 === 'string') {
		options = arg3 || { function: '', tags: [], details: '' };
		// Prepend function name before title, if it exists
		options.title = options.function ? `${options.function}:${arg1}` : arg1;
		options.details = arg2;
	} else {
		options = arg1;
	}

	if (gLogFunctions.some(globalFunction => globalFunction.includes(options.function)) ||
		options.tags.some(tag => gLogTags.includes(tag))) {
		// Log should be output
		log.debug(options.title, options.details);
	}
};
*/

export interface EnhLogFunction {
	(title: string, details: any, options?: EnhLogOptions, additionalTags?: string | string[]): void;
	(options: EnhLogOptions, additionalTags?: string | string[]): void;
}

class ELog {
	private static instance: ELog;
	private globalFunctions: string[] = [];
	private globalTags: string[] = [];
	private includeFunctions: string[] = [];
	private excludeFunctions: string[] = [];
	private includeTags: string[] = [];
	private excludeTags: string[] = [];

	private constructor() {}

	public static getInstance(): ELog {
		if (!ELog.instance) {
			ELog.instance = new ELog();
		}
		return ELog.instance;
	}

	public setFunctions(functions: string[]): void {
		this.globalFunctions = functions;
		this.includeFunctions = functions.filter(func => !func.startsWith('!'));
		this.excludeFunctions = functions.filter(func => func.startsWith('!')).map(func => func.slice(1));
	}

	public setTags(tags: string[]): void {
		this.globalTags = tags;
		this.includeTags = tags.filter(tag => !tag.startsWith('!'));
		this.excludeTags = tags.filter(tag => tag.startsWith('!')).map(tag => tag.slice(1));
	}


	public addFunctions(functions: string[]): void {
		this.globalFunctions = [...this.globalFunctions, ...functions];
		this.includeFunctions = this.globalFunctions.filter(func => !func.startsWith('!'));
		this.excludeFunctions = this.globalFunctions.filter(func => func.startsWith('!')).map(func => func.slice(1));
	}

	public addTags(tags: string[]): void {
		this.globalTags = [...this.globalTags, ...tags];
		this.includeTags = this.globalTags.filter(tag => !tag.startsWith('!'));
		this.excludeTags = this.globalTags.filter(tag => tag.startsWith('!')).map(tag => tag.slice(1));
	}

	// Case Insensitive methods to REMOVE Functions/Tags from list
	public delFunctions(functions: string[]): void {
		const functionsLower = functions.map(func => func.toLowerCase());
		this.globalFunctions = this.globalFunctions.filter(func => !functionsLower.includes(func.toLowerCase()));
		this.includeFunctions = this.globalFunctions.filter(func => !func.startsWith('!'));
		this.excludeFunctions = this.globalFunctions.filter(func => func.startsWith('!')).map(func => func.slice(1));
	}

	public delTags(tags: string[]): void {
		const tagsLower = tags.map(tag => tag.toLowerCase());
		this.globalTags = this.globalTags.filter(tag => !tagsLower.includes(tag.toLowerCase()));
		this.includeTags = this.globalTags.filter(tag => !tag.startsWith('!'));
		this.excludeTags = this.globalTags.filter(tag => tag.startsWith('!')).map(tag => tag.slice(1));
	}

	private genericLog(logFunc: LogFunction, arg1: any, arg2?: any, arg3?: EnhLogOptions, arg4?: string | string[]): void {
		let options: EnhLogOptions;
		let maxLogLength = 3999;
		let stLogTitle = "genericLog";

		if (options?.debug) {logFunc(`${stLogTitle}.arg1`, arg1);}
		if (typeof arg1 === 'string') {
			options = {...arg3} || { function: '', tags: [], details: '' };
			options.title = options.function ? `${options.function}:${arg1}` : arg1;
			options.details = typeof arg2 === 'object' ? JSON.stringify(arg2) : arg2.toString();
		} else {
			options = {...arg1};
			options.details = typeof options.details === 'object' ? JSON.stringify(options.details) : options.details.toString();
			options.title = options.function ? `${options.function}:${options.title}` : options.title;
		}
		// if options.breakLarge is not set, set to TRUE
		options.breakLarge = options.breakLarge === undefined ? true : options.breakLarge;
		// if options.outputTags is not set, set to TRUE
		options.outputTags = options.outputTags === undefined ? true : options.outputTags;

		// Add new tags
		if (arg4) {
			if (Array.isArray(arg4)) {
				options.tags = [...options.tags, ...arg4];
			} else {
				options.tags.push(arg4);
			}
		}
		if (options?.debug) {logFunc(`${stLogTitle}.options`, options);}

		if (options.outputTags) {
			let tagString = options.tags.length > 0 ? `(${options.tags.join(', ')})` : "";
			options.title = tagString ? `${options.title} --- tags:${tagString} ---` : options.title;
		}

		// Case Sensitive Match
		// let shouldInclude = this.includeFunctions.some(func => func.includes(options.function)) ||
		// 	options.tags.some(tag => this.includeTags.includes(tag));
		// let shouldExclude = this.excludeFunctions.some(func => func.includes(options.function)) ||
		// 	options.tags.some(tag => this.excludeTags.includes(tag));

		// Case InSensitive Match - Converts function/tags to LOWERCASE prior to match
		let shouldInclude = this.includeFunctions.some(func => func.toLowerCase().includes(options.function.toLowerCase())) ||
			options.tags.some(tag => this.includeTags.map(t => t.toLowerCase()).includes(tag.toLowerCase()));
		let shouldExclude = this.excludeFunctions.some(func => func.toLowerCase().includes(options.function.toLowerCase())) ||
			options.tags.some(tag => this.excludeTags.map(t => t.toLowerCase()).includes(tag.toLowerCase()));

		if (options?.debug) {logFunc(`${stLogTitle}:shouldInclude, shouldExclude`, `${shouldInclude}, ${shouldExclude}`);}
		if (shouldInclude && !shouldExclude) {
			// Log should be output
			if (options?.debug) {
				logFunc(`${stLogTitle}.Log Should be Output. Title:`, options.title);
				logFunc(`${stLogTitle}.Log Should be Output. Details:`, options.details);
			}

			if (options.breakLarge) {
				if (options?.debug) {logFunc(`${stLogTitle}.options.breakLarge = TRUE`, options.breakLarge);}
				const logString = options.details;
				const logChunks = splitText(logString, maxLogLength);
				let iChunk = logChunks.length;
				for (const chunk of logChunks.reverse()) {
					const title = logChunks.length > 1 ? `${options.title} (${iChunk}/${logChunks.length}):` : options.title;
					logFunc(title, chunk);
					iChunk--;
				}
			} else {
				logFunc(options.title, options.details);
			}
		} else {
			if (options?.debug) {
				logFunc(`${stLogTitle}.Log Should NOT be Output. Title:`, options.title);
				logFunc(`${stLogTitle}.Log Should NOT be Output. Details:`, options.details);
			}
		}
	}

	/**
	 * This function logs debug messages. It is part of the ELog class.
	 *
	 * @param {any} arg1 - The title of the log or an object of type EnhLogOptions. If arg1 is a string, arg2 and arg3 are used for details and options respectively. If arg1 is an object, it is used as the options object directly.
	 * @param {any} [arg2] - The details of the log. This parameter is used when arg1 is a string. If arg2 is an object, it will be stringified.
	 * @param {EnhLogOptions} [arg3] - An optional parameter that specifies additional options for the log, such as function and tags. This parameter is used when arg1 is a string.
	 * @param {string|string[]} [arg4] - An optional parameter that specifies additional tags. This can be a single tag as a string or an array of tags.
	 *
	 * @function
	 * @example
	 * // Using string arguments for title and details, and an options object
	 * elog.debug('Title', 'Details', { function: 'function1', tags: ['tag1', 'tag2'] }, 'newTag');
	 *
	 * // Using an options object as the only argument
	 * elog.debug({ title: 'Title', details: 'Details', function: 'function1', tags: ['tag1', 'tag2'] }, null, null, ['newTag1', 'newTag2']);
	 *
	 * elog.setFunctions(["function1", "!function2"]);
	 * elog.setTags(["tag1", "!tag2"]);
	 * elog.debug("Test", "This is a test log", { function: "function1", tags: ["tag1"] });
	 * Setting Options Usage:
	 * 	  let eOpt : EnhLogOptions = {
	 * 		  function: 'processTranList',
	 * 		  tags: ['detail']
	 * 	  };
	 * Then call with:
	 *    elog.debug(`asLinks`, asLinks, eOpt);
	 * Setting Additional eOpt when calling:
	 *    Set eOpt as above, then call as follows:
	 *    eLog.debug('Title','DETAIL2', {...eOpt, tags:['detail2']});
	 *
	 * @returns {void}
	 */
	public debug: EnhLogFunction = (arg1: any, arg2?: any, arg3?: EnhLogOptions, arg4?: string | string[]) => {
		this.genericLog(log.debug, arg1, arg2, arg3, arg4);
	}

	public audit: EnhLogFunction = (arg1: any, arg2?: any, arg3?: EnhLogOptions, arg4?: string | string[]) => {
		this.genericLog(log.audit, arg1, arg2, arg3, arg4);
	}

	public error: EnhLogFunction = (arg1: any, arg2?: any, arg3?: EnhLogOptions, arg4?: string | string[]) => {
		this.genericLog(log.error, arg1, arg2, arg3, arg4);
	}

	public emergency: EnhLogFunction = (arg1: any, arg2?: any, arg3?: EnhLogOptions, arg4?: string | string[]) => {
		this.genericLog(log.emergency, arg1, arg2, arg3, arg4);
	}
}

// Global Log Object
// Calling Usage:
//  elog.setFunctions(["function1", "!function2"]);
//  elog.setTags(["tag1", "!tag2"]);
//  elog.debug("Test", "This is a test log", { function: "function1", tags: ["tag1"] });
// Setting Options Usage:
// 	  let eOpt : EnhLogOptions = {
// 		  function: 'processTranList',
// 		  tags: ['detail']
// 	  };
// Then call with:
//    elog.debug(`asLinks`, asLinks, eOpt);
// Setting Additional eOpt when calling:
//    Set eOpt as above, then call as follows:
//    eLog.debug('Title','DETAIL2', {...eOpt, tags:['detail2']});

export const elog = ELog.getInstance();



// export interface TypeMap {
// 	[key: string]: string;
// }

export function combineColumnsAndTypes(columns: query.Column[], types: string[]): query.Column[] {
	// const typeMap: TypeMap = {};
	// types.forEach((type, index) => typeMap[index] = type);

	const result: query.Column[] = [];
	columns.forEach((column, index) => {
		//const type = typeMap[index] || null;
		const type = types[index];
		const newColumn: query.Column = {
			prototype: column.prototype,
			fieldId: column.fieldId,
			component: column.component,
			formula: column.formula,
			type: type,
			aggregate: column.aggregate,
			groupBy: column.groupBy,
			label: column.label,
			alias: column.alias,
			context: column.context
		};
		result.push(newColumn);
	});
	return result;
}

// --------------------------------------------------------------
// @hitc Non-Exported Interfaces - Added here so I can use them

// Version of the Query.Column Interface that isn't 100% READONLY (which SUCKS!)
export interface Column {
	/**
	 * Id of column field.
	 * @throws {SuiteScriptError} READ_ONLY when setting the property is attempted
	 */
	readonly prototype: string;

	/**
	 * Query component. Returns the Component to which this column belongs.
	 * @throws {SuiteScriptError} READ_ONLY when setting the property is attempted
	 */
	 component: Component;

	/** Holds the name of the query result column. */
	 fieldId: string;

	/**
	 * Formula.
	 * @throws {SuiteScriptError} READ_ONLY when setting the property is attempted
	 */
	 formula: string;

	/**
	 * Desired value type of the formula (if it was explicitly stated upon Column creation).
	 * @throws {SuiteScriptError} READ_ONLY when setting the property is attempted
	 */
	 type: string | ReturnType;

	/**
	 * Aggregate function (value from Aggregate enum).
	 * @throws {SuiteScriptError} READ_ONLY when setting the property is attempted
	 */
	 aggregate: string;

	/**
	 * The group-by flag.
	 * @throws {SuiteScriptError} READ_ONLY when setting the property is attempted
	 */
	 groupBy: boolean;

	 label: string;
	 alias: string;
	 aliasId?: string; // This version of the alias is valid for custpage IDs (it has dots converted to _)

	/** The field context for values in the query result column. */
	 context: ColumnContextOptions;
}

export interface ColumnContextOptions {
	/** The name of the field context. */
	name: string | FieldContext,
	/** The additional parameters to use with the specified field context. */
	params?: {
		/** The internal ID of the currency to convert to. */
		currencyId?: number,
		/** The date to use for the actual exchange rate between the base currency and the currency to convert to. */
		date?: RelativeDate | Date
	}
}

export enum ReturnType {
	ANY = "ANY",
	BOOLEAN = "BOOLEAN",
	CURRENCY = "CURRENCY",
	DATE = "DATE",
	DATETIME = "DATETIME",
	DURATION = "DURATION",
	FLOAT = "FLOAT",
	HIDDEN = "HIDDEN",
	INTEGER = "INTEGER",
	KEY = "KEY",
	PERCENT = "PERCENT",
	RELATIONSHIP = "RELATIONSHIP",
	STRING = "STRING",
	UNKNOWN = "UNKNOWN",
}

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