/**
 * avc_accountbalrpt_main_cs.ts
 *
 * @NScriptName AVC | Account Balance Report | CS
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 * Purpose: Provide Client Script Hooks for Account Bal App - Client Script
 *
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
import message = require('N/ui/message');
import dialog = require('N/ui/dialog');

// @ts-ignore
import * as avm from "./avc_sl_util";
import {createAcctBalQuery, EnhLogOptions, ReturnType, elog} from "./avc_sl_util";
// @ts-ignore
import {currentRecord, url} from "N";


// let gFilterFormId = avm.gFilterFormId;
// let gSublistName = avm.gSublistName;
let gFilterFormId = avm.AcctBalSettings.FilterFormId;
let gSublistName = avm.AcctBalSettings.SublistName;


export let pageInit: EntryPoints.Client.pageInit = (context : EntryPoints.Client.pageInitContext) => {
	let eOpt : EnhLogOptions = {
		function: 'pageInit',
		tags: ['main'],
	};
	elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.

	//log.debug('pageInit', JSON.stringify(context));
	//console.log(`pageInit:${JSON.stringify(context)}`);
	// elog.console("context", context, eOpt)
	// let val = getTableCellValue(`custpage_${gSublistName}`, 1, 4 );
	// elog.console("val", val, eOpt);

	// Format the Lines that don't even HAVE Ending Balances
	//formatTranAcctTable(`custpage_${gSublistName}`, 6, "#f0e191");
	formatTranAcctTable(`custpage_${gSublistName}`, 6, avm.AcctBalSettings.BgColor_NoEndingBal, (cell: HTMLTableCellElement) => {
		// Check if there's any <a> element in the cell
		return cell.getElementsByTagName('a').length === 0;
	});

	// Format the Lines that have Ending Balances that don't match Internal
	//formatTranAcctTable(`custpage_${gSublistName}`, 7, "#ebd0d1");
	formatTranAcctTable(`custpage_${gSublistName}`, 7, avm.AcctBalSettings.BgColor_BalMismatch, (cell: HTMLTableCellElement) => {
		// Parse the cell's text to a number and check if it's NaN
		return isNaN(Number(cell.innerText.trim()));
	});

	// Attach jQuery Collapsing to Help Section
	// @ts-ignore
	/*
	jQuery(".help-toggle").on("click", () => {
		//@ts-ignore
			jQuery(".help-content").slideToggle();
		});
	*/

}


function formatTranAcctTable1(baseId: string, columnToCheck: number, color: string): void {
	let eOpt : EnhLogOptions = {
		function: 'formatTranAcctTable',
		tags: ['TranAcct','table'],
	};
	elog.addFunctions([eOpt.function]); // Include the current Function. Comment out to NOT include it.
	let formId = baseId + '_form';
	// Retrieve the form
	const form: HTMLElement | null = document.getElementById(formId);

	// Validate if form exists
	if(form === null) {
		console.log("Form not found");
		return;
	}

	// Find table within the form
	const table: HTMLTableElement = form.getElementsByTagName('table')[0];

	// Validate if table exists
	if(!table) {
		console.log("Table not found");
		return;
	}

	// Iterate over rows (skip first row, since that contains Headers)
	for (let i = 1; i < table.rows.length; i++) {
		const row: HTMLTableRowElement = table.rows[i];

		// Check if the cell in the specified column is not a number
		elog.console(`Check Row ${i}, Col ${columnToCheck}:`, row.cells[columnToCheck].innerText.trim(), eOpt);
		const cell: HTMLTableCellElement = row.cells[columnToCheck];
		if ((cell && isNaN(Number(cell.innerText.trim()))) ||
			(cell.getElementsByTagName('a').length === 0))		{
			// Set the background color of the row
			elog.console(`Set Background Color of row ${i} to:`, color, eOpt);
			//row.style.backgroundColor = color; // This is NOT working.
			// Set the background color of the row
			//row.setAttribute('style', `background-color: ${color}`); // This does NOT work.

			// Iterate over all cells in the row and set each TD element
			for (let j = 0; j < row.cells.length; j++) {
				const cell: HTMLTableCellElement = row.cells[j];
				// Set the background color of the cell
				cell.setAttribute('style', `background-color: ${color} !important`);
			}
		}
	}
}

type ConditionFunction = (cell: HTMLTableCellElement) => boolean;

function formatTranAcctTable(baseId: string, columnToCheck: number, color: string, condition: ConditionFunction): void {
	let eOpt: EnhLogOptions = {
		function: 'formatTranAcctTable',
		tags: ['TranAcct', 'table'],
	};
	elog.addFunctions([eOpt.function]); // Include the current function. Comment out to NOT include it.
	let formId = baseId + '_form';

	// Retrieve the form
	const form: HTMLElement | null = document.getElementById(formId);

	// Validate if form exists
	if(form === null) {
		console.log("Form not found");
		return;
	}

	// Find table within the form
	const table: HTMLTableElement = form.getElementsByTagName('table')[0];

	// Validate if table exists
	if(!table) {
		console.log("Table not found");
		return;
	}

	// Iterate over rows (skip first row, since that contains headers)
	for (let i = 1; i < table.rows.length; i++) {
		const row: HTMLTableRowElement = table.rows[i];
		const cell: HTMLTableCellElement = row.cells[columnToCheck];

		// Check cell using the provided condition function
		if (condition(cell)) {
			// Set the background color of the row
			elog.console(`Set Background Color of row ${i} to:`, color, eOpt);

			// Iterate over all cells in the row and set each TD element
			for (let j = 0; j < row.cells.length; j++) {
				const cell: HTMLTableCellElement = row.cells[j];
				// Set the background color of the cell
				cell.setAttribute('style', `background-color: ${color} !important`);
			}
		}
	}
}


function getTableCellValue(baseId: string, rowIndex: number, cellIndex: number): string | undefined {
	let formId = baseId + '_form';
	// Retrieve the form
	const form: HTMLElement | null = document.getElementById(formId);

	// Validate if form exists
	if(form === null) {
		console.log("Form not found");
		return;
	}

	// Find table within the form
	const table: HTMLTableElement = form.getElementsByTagName('table')[0];

	// Validate if table exists
	if(!table) {
		console.log("Table not found");
		return;
	}

	// Retrieve the specific row
	const row: HTMLTableRowElement | undefined = table.rows[rowIndex];

	// Validate if row exists
	if(!row) {
		console.log("Row not found");
		return;
	}

	// Retrieve the specific cell
	const cell: HTMLTableCellElement | undefined = row.cells[cellIndex];

	// Validate if cell exists
	if(!cell) {
		console.log("Cell not found");
		return;
	}

	// Retrieve cell content
	const cellValue: string = cell.textContent || cell.innerText;

	return cellValue;
}


