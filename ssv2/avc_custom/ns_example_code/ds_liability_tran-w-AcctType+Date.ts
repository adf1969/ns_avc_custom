/* Query */
const transactionQueryPOPC = query.create({
	type: query.Type.TRANSACTION,
});

/* Joins */
const transactionlinesJoinPFQA = transactionQueryPOPC.autoJoin({
	fieldId: 'transactionlines',
});

const accountingimpactJoinSBCJ = transactionlinesJoinPFQA.autoJoin({
	fieldId: 'accountingimpact',
});

const accountJoinPDUM = accountingimpactJoinSBCJ.autoJoin({
	fieldId: 'account',
});

/* Conditions */
const transactionQueryPOPCConditionHRYO = accountJoinPDUM.createCondition({
	fieldId: 'accttype',
	operator: query.Operator.ANY_OF,
	values: [
		'LongTermLiab',
	],
});

const transactionQueryPOPCConditionNLLT = transactionQueryPOPC.createCondition({
	fieldId: 'trandate',
	operator: query.Operator.ON_OR_BEFORE,
	values: [
		'12/31/2022',
	],
});

transactionQueryPOPC.condition = transactionQueryPOPC.and(
	transactionQueryPOPCConditionNLLT,
	transactionQueryPOPCConditionHRYO,
);

/* Columns */
const transactionQueryPOPCColumnBLSD = transactionQueryPOPC.createColumn({
	fieldId: 'id',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Internal ID',
	alias: 'BLSD',
});

const transactionQueryPOPCColumnTBOZ = transactionQueryPOPC.createColumn({
	fieldId: 'trandisplayname',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Transaction',
	alias: 'TBOZ',
});

const transactionQueryPOPCColumnMFMU = transactionlinesJoinPFQA.createColumn({
	fieldId: 'subsidiary',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Subsidiary',
	alias: 'MFMU',
});

const transactionQueryPOPCColumnSYZP = accountJoinPDUM.createColumn({
	fieldId: 'id',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Internal ID',
	alias: 'SYZP',
});

const transactionQueryPOPCColumnPCDG = accountJoinPDUM.createColumn({
	fieldId: 'isinactive',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Inactive',
	alias: 'PCDG',
});

const transactionQueryPOPCColumnKCDI = accountJoinPDUM.createColumn({
	fieldId: 'accttype',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Type',
	alias: 'KCDI',
});

const transactionQueryPOPCColumnIMHM = transactionlinesJoinPFQA.createColumn({
	fieldId: 'expenseaccount',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Expense Account',
	alias: 'IMHM',
});

const transactionQueryPOPCColumnOLBN = transactionQueryPOPC.createColumn({
	fieldId: 'trandate',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Date',
	alias: 'OLBN',
});

const transactionQueryPOPCColumnTCVU = transactionlinesJoinPFQA.createColumn({
	fieldId: 'netamount',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Amount (Net) (Transaction Currency)',
	alias: 'TCVU',
});

const transactionQueryPOPCColumnSGWE = transactionlinesJoinPFQA.createColumn({
	fieldId: 'custcol_avc_ending_bal',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Ending Balance',
	alias: 'SGWE',
});

transactionQueryPOPC.columns = [
	transactionQueryPOPCColumnBLSD,
	transactionQueryPOPCColumnTBOZ,
	transactionQueryPOPCColumnMFMU,
	transactionQueryPOPCColumnSYZP,
	transactionQueryPOPCColumnPCDG,
	transactionQueryPOPCColumnKCDI,
	transactionQueryPOPCColumnIMHM,
	transactionQueryPOPCColumnOLBN,
	transactionQueryPOPCColumnTCVU,
	transactionQueryPOPCColumnSGWE,
];

/* Results */
// Note: Query.run() is limited to 5,000 results
// transactionQueryPOPC.run().results.forEach((result: query.Result): void => {
//   const resultMap = result.asMap();
//
//   // ...
// });

/* Results */
const transactionQueryPOPCPagedData: query.PagedData = transactionQueryPOPC.runPaged({ pageSize: 1000 });
for (let i = 0; i < transactionQueryPOPCPagedData.pageRanges.length; i++) {
	const transactionQueryPOPCPage: query.Page = transactionQueryPOPCPagedData.fetch(i);
	// const transactionQueryPOPCPageTypes: string[] = transactionQueryPOPCPage.data.types;
	const transactionQueryPOPCPageResults: query.Result[] = transactionQueryPOPCPage.data.results;
	transactionQueryPOPCPageResults.forEach((result: query.Result): void => {
		const resultMap = result.asMap();

		const idBLSD = resultMap.BLSD; // Internal ID
		const trandisplaynameTBOZ = resultMap.TBOZ; // Transaction
		const subsidiaryMFMU = resultMap.MFMU; // Subsidiary
		const idSYZP = resultMap.SYZP; // Internal ID
		const isinactivePCDG = resultMap.PCDG; // Inactive
		const accttypeKCDI = resultMap.KCDI; // Type
		const expenseaccountIMHM = resultMap.IMHM; // Expense Account
		const trandateOLBN = resultMap.OLBN; // Date
		const netamountTCVU = resultMap.TCVU; // Amount (Net) (Transaction Currency)
		const custcolAvcEndingBalSGWE = resultMap.SGWE; // Ending Balance

		// ...
	});
}
