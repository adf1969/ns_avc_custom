import {query} from "N";

/* Query */
const transactionQuery_TRAN = query.create({
	type: query.Type.TRANSACTION,
});

/* Joins */
const transactionlinesJoin_TranLines = transactionQuery_TRAN.autoJoin({
	fieldId: 'transactionlines',
});

const accountingimpactJoin_AcctImpact = transactionlinesJoin_TranLines.autoJoin({
	fieldId: 'accountingimpact',
});

const accountJoin_Account = accountingimpactJoin_AcctImpact.autoJoin({
	fieldId: 'account',
});

/* Conditions */
const transactionQueryOSOBConditionACCTTYPE = accountJoin_Account.createCondition({
	fieldId: 'accttype',
	operator: query.Operator.ANY_OF,
	values: [
		'LongTermLiab',
	],
});

const transactionQueryOSOBConditionTRANDATE = transactionQuery_TRAN.createCondition({
	fieldId: 'trandate',
	operator: query.Operator.ON_OR_BEFORE,
	values: [
		'12/01/2022',
	],
});

const transactionQueryOSOBConditionINACTIVE = accountJoin_Account.createCondition({
	fieldId: 'isinactive',
	operator: query.Operator.IS,
	values: [
		false,
	],
});

transactionQuery_TRAN.condition = transactionQuery_TRAN.and(
	transactionQueryOSOBConditionINACTIVE,
	transactionQueryOSOBConditionTRANDATE,
	transactionQueryOSOBConditionACCTTYPE,
);

/* Columns */
const transactionQuerySubsidiary = transactionlinesJoin_TranLines.createColumn({
	fieldId: 'subsidiary',
	groupBy: false,
	context: {
		name: 'DISPLAY',
	},
	// label: 'Subsidiary',
	alias: 'subsidiary',
});

const transactionQueryOSOBColumnCGCF = transactionlinesJoin_TranLines.createColumn({
	fieldId: 'expenseaccount',
	groupBy: false,
	context: {
		name: 'DISPLAY',
	},
	// label: 'Expense Account',
	alias: 'CGCF',
});

const transactionQueryOSOBColumnPHPQ = transactionlinesJoin_TranLines.createColumn({
	fieldId: 'netamount',
	groupBy: false,
	context: {
		name: 'SIGN_CONSOLIDATED',
	},
	// label: 'Amount (Net) (Transaction Currency)',
	alias: 'PHPQ',
});

transactionQuery_TRAN.columns = [
	transactionQuerySubsidiary,
	transactionQueryOSOBColumnCGCF,
	transactionQueryOSOBColumnPHPQ,
];

/* Results */
// Note: Query.run() is limited to 5,000 results
// transactionQueryOSOB.run().results.forEach((result: query.Result): void => {
//   const resultMap = result.asMap();
//
//   // ...
// });

/* Results */
const transactionQueryOSOBPagedData: query.PagedData = transactionQuery_TRAN.runPaged({ pageSize: 1000 });
for (let i = 0; i < transactionQueryOSOBPagedData.pageRanges.length; i++) {
	const transactionQueryOSOBPage: query.Page = transactionQueryOSOBPagedData.fetch(i);
	// const transactionQueryOSOBPageTypes: string[] = transactionQueryOSOBPage.data.types;
	const transactionQueryOSOBPageResults: query.Result[] = transactionQueryOSOBPage.data.results;
	transactionQueryOSOBPageResults.forEach((result: query.Result): void => {
		const resultMap = result.asMap();

		const subsidiaryPKBP = resultMap.PKBP; // Subsidiary
		const expenseaccountCGCF = resultMap.CGCF; // Expense Account
		const netamountPHPQ = resultMap.PHPQ; // Amount (Net) (Transaction Currency)

		// ...
	});
}
