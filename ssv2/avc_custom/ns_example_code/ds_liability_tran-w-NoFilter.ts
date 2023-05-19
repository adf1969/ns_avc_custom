/* Query */
const transactionQueryJICL = query.create({
	type: query.Type.TRANSACTION,
});

/* Joins */
const transactionlinesJoinEJUN = transactionQueryJICL.autoJoin({
	fieldId: 'transactionlines',
});

const accountingimpactJoinCYRP = transactionlinesJoinEJUN.autoJoin({
	fieldId: 'accountingimpact',
});

const accountJoinYKRK = accountingimpactJoinCYRP.autoJoin({
	fieldId: 'account',
});

/* Conditions */

/* Columns */
const transactionQueryJICLColumnNGCK = transactionQueryJICL.createColumn({
	fieldId: 'id',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Internal ID',
	alias: 'NGCK',
});

const transactionQueryJICLColumnRRAW = transactionQueryJICL.createColumn({
	fieldId: 'trandisplayname',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Transaction',
	alias: 'RRAW',
});

const transactionQueryJICLColumnEINV = transactionlinesJoinEJUN.createColumn({
	fieldId: 'subsidiary',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Subsidiary',
	alias: 'EINV',
});

const transactionQueryJICLColumnZGBC = accountJoinYKRK.createColumn({
	fieldId: 'id',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Internal ID',
	alias: 'ZGBC',
});

const transactionQueryJICLColumnWQFM = accountJoinYKRK.createColumn({
	fieldId: 'isinactive',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Inactive',
	alias: 'WQFM',
});

const transactionQueryJICLColumnJLXO = accountJoinYKRK.createColumn({
	fieldId: 'accttype',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Type',
	alias: 'JLXO',
});

const transactionQueryJICLColumnOHPV = transactionlinesJoinEJUN.createColumn({
	fieldId: 'expenseaccount',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Expense Account',
	alias: 'OHPV',
});

const transactionQueryJICLColumnOROV = transactionQueryJICL.createColumn({
	fieldId: 'trandate',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Date',
	alias: 'OROV',
});

const transactionQueryJICLColumnTCFX = transactionlinesJoinEJUN.createColumn({
	fieldId: 'netamount',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Amount (Net) (Transaction Currency)',
	alias: 'TCFX',
});

const transactionQueryJICLColumnUPCR = transactionlinesJoinEJUN.createColumn({
	fieldId: 'custcol_avc_ending_bal',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Ending Balance',
	alias: 'UPCR',
});

transactionQueryJICL.columns = [
	transactionQueryJICLColumnNGCK,
	transactionQueryJICLColumnRRAW,
	transactionQueryJICLColumnEINV,
	transactionQueryJICLColumnZGBC,
	transactionQueryJICLColumnWQFM,
	transactionQueryJICLColumnJLXO,
	transactionQueryJICLColumnOHPV,
	transactionQueryJICLColumnOROV,
	transactionQueryJICLColumnTCFX,
	transactionQueryJICLColumnUPCR,
];

/* Results */
// Note: Query.run() is limited to 5,000 results
// transactionQueryJICL.run().results.forEach((result: query.Result): void => {
//   const resultMap = result.asMap();
//
//   // ...
// });

/* Results */
const transactionQueryJICLPagedData: query.PagedData = transactionQueryJICL.runPaged({ pageSize: 1000 });
for (let i = 0; i < transactionQueryJICLPagedData.pageRanges.length; i++) {
	const transactionQueryJICLPage: query.Page = transactionQueryJICLPagedData.fetch(i);
	// const transactionQueryJICLPageTypes: string[] = transactionQueryJICLPage.data.types;
	const transactionQueryJICLPageResults: query.Result[] = transactionQueryJICLPage.data.results;
	transactionQueryJICLPageResults.forEach((result: query.Result): void => {
		const resultMap = result.asMap();

		const idNGCK = resultMap.NGCK; // Internal ID
		const trandisplaynameRRAW = resultMap.RRAW; // Transaction
		const subsidiaryEINV = resultMap.EINV; // Subsidiary
		const idZGBC = resultMap.ZGBC; // Internal ID
		const isinactiveWQFM = resultMap.WQFM; // Inactive
		const accttypeJLXO = resultMap.JLXO; // Type
		const expenseaccountOHPV = resultMap.OHPV; // Expense Account
		const trandateOROV = resultMap.OROV; // Date
		const netamountTCFX = resultMap.TCFX; // Amount (Net) (Transaction Currency)
		const custcolAvcEndingBalUPCR = resultMap.UPCR; // Ending Balance

		// ...
	});
}
