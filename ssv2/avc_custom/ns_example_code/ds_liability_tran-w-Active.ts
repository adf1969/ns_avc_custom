/* Query */
const transactionQueryBXKS = query.create({
	type: query.Type.TRANSACTION,
});

/* Joins */
const transactionlinesJoinHIRO = transactionQueryBXKS.autoJoin({
	fieldId: 'transactionlines',
});

const accountingimpactJoinHZTN = transactionlinesJoinHIRO.autoJoin({
	fieldId: 'accountingimpact',
});

const accountJoinTZJP = accountingimpactJoinHZTN.autoJoin({
	fieldId: 'account',
});

/* Conditions */
const transactionQueryBXKSConditionTJZV = accountJoinTZJP.createCondition({
	fieldId: 'isinactive',
	operator: query.Operator.IS,
	values: [
		false,
	],
});

transactionQueryBXKS.condition = transactionQueryBXKSConditionTJZV;

/* Columns */
const transactionQueryBXKSColumnKBZW = transactionQueryBXKS.createColumn({
	fieldId: 'id',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Internal ID',
	alias: 'KBZW',
});

const transactionQueryBXKSColumnJSIN = transactionQueryBXKS.createColumn({
	fieldId: 'trandisplayname',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Transaction',
	alias: 'JSIN',
});

const transactionQueryBXKSColumnNCZT = transactionlinesJoinHIRO.createColumn({
	fieldId: 'subsidiary',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Subsidiary',
	alias: 'NCZT',
});

const transactionQueryBXKSColumnTMHD = accountJoinTZJP.createColumn({
	fieldId: 'id',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Internal ID',
	alias: 'TMHD',
});

const transactionQueryBXKSColumnBEXK = accountJoinTZJP.createColumn({
	fieldId: 'isinactive',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Inactive',
	alias: 'BEXK',
});

const transactionQueryBXKSColumnRRPV = accountJoinTZJP.createColumn({
	fieldId: 'accttype',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Type',
	alias: 'RRPV',
});

const transactionQueryBXKSColumnWDNC = transactionlinesJoinHIRO.createColumn({
	fieldId: 'expenseaccount',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Expense Account',
	alias: 'WDNC',
});

const transactionQueryBXKSColumnYCHS = transactionQueryBXKS.createColumn({
	fieldId: 'trandate',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Date',
	alias: 'YCHS',
});

const transactionQueryBXKSColumnVGIB = transactionlinesJoinHIRO.createColumn({
	fieldId: 'netamount',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Amount (Net) (Transaction Currency)',
	alias: 'VGIB',
});

const transactionQueryBXKSColumnEDGU = transactionlinesJoinHIRO.createColumn({
	fieldId: 'custcol_avc_ending_bal',
	groupBy: false,
	context: {
		name: 'RAW',
	},
	// label: 'Ending Balance',
	alias: 'EDGU',
});

transactionQueryBXKS.columns = [
	transactionQueryBXKSColumnKBZW,
	transactionQueryBXKSColumnJSIN,
	transactionQueryBXKSColumnNCZT,
	transactionQueryBXKSColumnTMHD,
	transactionQueryBXKSColumnBEXK,
	transactionQueryBXKSColumnRRPV,
	transactionQueryBXKSColumnWDNC,
	transactionQueryBXKSColumnYCHS,
	transactionQueryBXKSColumnVGIB,
	transactionQueryBXKSColumnEDGU,
];

/* Results */
// Note: Query.run() is limited to 5,000 results
// transactionQueryBXKS.run().results.forEach((result: query.Result): void => {
//   const resultMap = result.asMap();
//
//   // ...
// });

/* Results */
const transactionQueryBXKSPagedData: query.PagedData = transactionQueryBXKS.runPaged({ pageSize: 1000 });
for (let i = 0; i < transactionQueryBXKSPagedData.pageRanges.length; i++) {
	const transactionQueryBXKSPage: query.Page = transactionQueryBXKSPagedData.fetch(i);
	// const transactionQueryBXKSPageTypes: string[] = transactionQueryBXKSPage.data.types;
	const transactionQueryBXKSPageResults: query.Result[] = transactionQueryBXKSPage.data.results;
	transactionQueryBXKSPageResults.forEach((result: query.Result): void => {
		const resultMap = result.asMap();

		const idKBZW = resultMap.KBZW; // Internal ID
		const trandisplaynameJSIN = resultMap.JSIN; // Transaction
		const subsidiaryNCZT = resultMap.NCZT; // Subsidiary
		const idTMHD = resultMap.TMHD; // Internal ID
		const isinactiveBEXK = resultMap.BEXK; // Inactive
		const accttypeRRPV = resultMap.RRPV; // Type
		const expenseaccountWDNC = resultMap.WDNC; // Expense Account
		const trandateYCHS = resultMap.YCHS; // Date
		const netamountVGIB = resultMap.VGIB; // Amount (Net) (Transaction Currency)
		const custcolAvcEndingBalEDGU = resultMap.EDGU; // Ending Balance

		// ...
	});
}
