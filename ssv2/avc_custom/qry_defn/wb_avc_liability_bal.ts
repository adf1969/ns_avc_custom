/* Query */
const transactionQueryYGYY = query.create({
	type: query.Type.TRANSACTION,
});

/* Joins */
const transactionlinesJoinVZIW = transactionQueryYGYY.autoJoin({
	fieldId: 'transactionlines',
});

const accountingimpactJoinRFPO = transactionlinesJoinVZIW.autoJoin({
	fieldId: 'accountingimpact',
});

const accountJoinDYFG = accountingimpactJoinRFPO.autoJoin({
	fieldId: 'account',
});

/* Conditions */

/* Columns */
const transactionQueryYGYYColumnFQIS = transactionQueryYGYY.createColumn({
	fieldId: 'id',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'TranId',
	alias: 'FQIS',
});

const transactionQueryYGYYColumnZVMQ = transactionQueryYGYY.createColumn({
	fieldId: 'trandisplayname',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Transaction',
	alias: 'ZVMQ',
});

const transactionQueryYGYYColumnJEUB = transactionlinesJoinVZIW.createColumn({
	fieldId: 'subsidiary',
	groupBy: false,
	context: {
		name: 'DISPLAY',
	},
	// label: 'Subsidiary',
	alias: 'JEUB',
});

const transactionQueryYGYYColumnTOUY = accountJoinDYFG.createColumn({
	fieldId: 'id',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'BillId',
	alias: 'TOUY',
});

const transactionQueryYGYYColumnTABU = accountJoinDYFG.createColumn({
	fieldId: 'isinactive',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Inactive',
	alias: 'TABU',
});

const transactionQueryYGYYColumnPIXA = accountJoinDYFG.createColumn({
	fieldId: 'accttype',
	groupBy: false,
	context: {
		name: 'DISPLAY',
	},
	// label: 'Type',
	alias: 'PIXA',
});

const transactionQueryYGYYColumnBQTU = transactionlinesJoinVZIW.createColumn({
	fieldId: 'expenseaccount',
	groupBy: false,
	context: {
		name: 'DISPLAY',
	},
	// label: 'Expense Account',
	alias: 'BQTU',
});

const transactionQueryYGYYColumnFQVQ = transactionQueryYGYY.createColumn({
	fieldId: 'trandate',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Date',
	alias: 'FQVQ',
});

const transactionQueryYGYYColumnBZWQ = transactionlinesJoinVZIW.createColumn({
	fieldId: 'netamount',
	groupBy: false,
	context: {
		name: 'SIGN_CONSOLIDATED',
	},
	// label: 'Amount (Net) (Transaction Currency)',
	alias: 'BZWQ',
});

const transactionQueryYGYYColumnCBHR = transactionlinesJoinVZIW.createColumn({
	fieldId: 'custcol_avc_ending_bal',
	groupBy: false,
	context: {
		name: 'SIGN_CONSOLIDATED',
	},
	// label: 'Ending Balance',
	alias: 'CBHR',
});

transactionQueryYGYY.columns = [
	transactionQueryYGYYColumnFQIS,
	transactionQueryYGYYColumnZVMQ,
	transactionQueryYGYYColumnJEUB,
	transactionQueryYGYYColumnTOUY,
	transactionQueryYGYYColumnTABU,
	transactionQueryYGYYColumnPIXA,
	transactionQueryYGYYColumnBQTU,
	transactionQueryYGYYColumnFQVQ,
	transactionQueryYGYYColumnBZWQ,
	transactionQueryYGYYColumnCBHR,
];

/* Results */
// Note: Query.run() is limited to 5,000 results
// transactionQueryYGYY.run().results.forEach((result: query.Result): void => {
//   const resultMap = result.asMap();
//
//   // ...
// });

/* Results */
const transactionQueryYGYYPagedData: query.PagedData = transactionQueryYGYY.runPaged({ pageSize: 1000 });
for (let i = 0; i < transactionQueryYGYYPagedData.pageRanges.length; i++) {
	const transactionQueryYGYYPage: query.Page = transactionQueryYGYYPagedData.fetch(i);
	// const transactionQueryYGYYPageTypes: string[] = transactionQueryYGYYPage.data.types;
	const transactionQueryYGYYPageResults: query.Result[] = transactionQueryYGYYPage.data.results;
	transactionQueryYGYYPageResults.forEach((result: query.Result): void => {
		const resultMap = result.asMap();

		const idFQIS = resultMap.FQIS; // TranId
		const trandisplaynameZVMQ = resultMap.ZVMQ; // Transaction
		const subsidiaryJEUB = resultMap.JEUB; // Subsidiary
		const idTOUY = resultMap.TOUY; // BillId
		const isinactiveTABU = resultMap.TABU; // Inactive
		const accttypePIXA = resultMap.PIXA; // Type
		const expenseaccountBQTU = resultMap.BQTU; // Expense Account
		const trandateFQVQ = resultMap.FQVQ; // Date
		const netamountBZWQ = resultMap.BZWQ; // Amount (Net) (Transaction Currency)
		const custcolAvcEndingBalCBHR = resultMap.CBHR; // Ending Balance

		// ...
	});
}
