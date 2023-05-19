/**
 * avc_vbill_custom_ue.ts
 *
 * @NScriptName AVC | Vendor Bill Custom | UE
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 *
 * Purpose: Purpose: AVC Customizations to Vendor Bill Form - User Event Script
 */

// noinspection DuplicatedCode

import {EntryPoints} from "N/types";
import log = require('N/log');
import search = require("N/search");
import serverWidget = require('N/ui/serverWidget');
import {checkEndingBalance} from "./avc_vbill_custom_cs";
//import record = require('N/record');
import format = require("N/format");
import {addAvcCustomCSS} from "./avc_util";

let NS_BILL_EXPENSE_SUBLIST_ID = 'expense';
let NS_BILL_EXPENSE_SUBLIST_ENDINGBAL_ID = 'custcol_avc_ending_bal';
// @ts-ignore
let NS_BILL_EXPENSE_SUBLIST_ENDINGBAL_V_ID = 'custcol_avc_ending_bal_v';
let HTML_CHECK = '&check;';
let HTML_WARNING = '&#9888;';

export function beforeLoad(context: EntryPoints.UserEvent.beforeLoadContext) {
  let stLogTitle = 'beforeLoad';

  let form = context.form;

  // Add AVC CSS File
  // Ensure Custom CSS has been added to Form
  addAvcCustomCSS(form);

  let bHideExpense_EndingBalView = true;    // Default is to HIDE this field
  // Only run in Create/Edit/Copy/View Modes
  if ([context.UserEventType.CREATE, context.UserEventType.COPY,
    context.UserEventType.EDIT, context.UserEventType.VIEW].includes(context.type)) {
    log.debug(`${stLogTitle}:context.type`, context.type);

    // Expense Sublist
    let slExpense = form.getSublist({id:NS_BILL_EXPENSE_SUBLIST_ID});

    // Main Section
    // Only Display if:
    //    Not in Edit Mode or View Mode ||
    //    Account is a Liability Account
    //  AND
    //    Not in Create Mode
    let bHideEndingBalanceCol = (!([context.UserEventType.EDIT, context.UserEventType.VIEW].includes(context.type)) || getHideEndingBalCol(slExpense)) &&
      (!([context.UserEventType.CREATE].includes(context.type)));
    if (bHideEndingBalanceCol) {
      log.debug(`${stLogTitle}`, 'HIDE:Ending Balance');
      slExpense.getField({id: NS_BILL_EXPENSE_SUBLIST_ENDINGBAL_ID}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    }

    //TODO: Convert the entire Account / Ending Balance Code to an Object to clean up all the messy variable logic
    //TODO: Figure out a way to put that Object in a Util.ts file so it can be loaded both in avc_vbill_custom_ue and avc_vbill_custom_cs files

    if ((!bHideEndingBalanceCol) && ([context.UserEventType.VIEW].includes(context.type))) {
      log.debug(`${stLogTitle}`, 'HIDE:Ending Balance, SHOW:Ending Balance View');
      slExpense.getField({id: NS_BILL_EXPENSE_SUBLIST_ENDINGBAL_ID}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
      bHideExpense_EndingBalView = false; // Not sure WHY I can't set the updateDisplayType, but it does NOT work when I set it to SHOW, so I have to do this.
      checkExpenseEndingBalValues(context);
    }


    // Remove Columns from the Expense Sublist that we don't need
    slExpense.getField({id: 'category'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
    slExpense.getField({id: 'department'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
    slExpense.getField({id: 'class'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})

    // Add Validate Mortgage Pmt Button
    //TODO: I need to add Client Script that adds the callCheckEndingBalance() code since this code is ONLY on the server.
    /*
    form.addButton({
      id: 'custpage_avc_validate_mge',
      label: 'Validate Mortgage Pmt',
      functionName: 'callCheckEndingBalance()'
    })
     */

    if (bHideExpense_EndingBalView) {
      slExpense.getField({id: NS_BILL_EXPENSE_SUBLIST_ENDINGBAL_V_ID}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
    }
  }

  // Only run in View Mode
  if ([context.UserEventType.VIEW].includes(context.type)) {
    log.debug('Before Load', context.type);
    let form = context.form;
    log.debug(stLogTitle + ':context.form', JSON.stringify(form));
    let rec = context.newRecord
    log.debug(stLogTitle + ':context.newRecord', JSON.stringify(rec));
    let billId = rec.getValue('id');

    //// -- ADD ATTACHMENT TO FILE LINK
    // @ts-ignore
    let [firstFileIdFields, attCount] = getFirstAttachedFileIdFields('VendBill', billId);

    if (firstFileIdFields) {
      // We must use Join Syntax to get the values
      // see: https://stackoverflow.com/questions/43194963/netsuite-transaction-saved-search-item-join
      // @ts-ignore
      let fileUrl:string = firstFileIdFields.getValue({name: 'url', join: 'file'});
      // @ts-ignore
      let fileId = firstFileIdFields.getValue({name: 'internalid', join: 'file'});
      // @ts-ignore
      let fileName = firstFileIdFields.getValue({name: 'name', join: 'file'});
      let fileSizeKb = firstFileIdFields.getValue({name: 'documentsize', join: 'file'});

      // Now create the Link to put on the page. Put it below the 'account' field since there is space there.
      let fieldId = 'custpage_avc_urlfilelink';
      let fileLinkHtml = '';
      fileLinkHtml += '<div class="uir-field-wrapper">';
      fileLinkHtml += `<span id="${fieldId}fs_lbl_uir_label" class="smallgraytextnolink uir-label">`;
      fileLinkHtml += `<span id="${fieldId}_fs_lbl" class="smallgraytextnolink">`;
      if (attCount > 1) {
        fileLinkHtml += `Attachments (${attCount})`;
      } else {
        fileLinkHtml += 'Attachment';
      }

      fileLinkHtml += '</span></span>';
      fileLinkHtml += `<span class="inputreadonly"><a class="dottedlink" href="${fileUrl}" target="_blank">${fileName} (${fileSizeKb} KB)</a></span>`;
      fileLinkHtml += '</div>';
      let fileLink = form.addField({
        id: 'custpage_avc_urlfilelink',
        type: serverWidget.FieldType.INLINEHTML,
        label: 'Attached File:'
      });
      fileLink.defaultValue = fileLinkHtml;
      form.insertField({
        field: fileLink,
        nextfield: 'postingperiod'
      });
    }

    // ADD DEFAULT BANK ACCOUNT BALANCE Display
    let locId = rec.getValue('location');
    log.debug(stLogTitle + ':context.newRecord.location', locId);
    if (locId) {
      let bankAcct = getLocDefaultAPBankAcct(locId);
      log.debug(stLogTitle + ': DefaultApBankAcct', bankAcct);
      if (bankAcct) {
        let bankData = getBankAccountFields(bankAcct);
        log.debug(stLogTitle + ': BankAcctData', bankData);
        //let bankBalance = getBankAccountBalance(bankAcct);
        //log.debug(stLogTitle + ': BankAcctBalance', bankBalance);

        if (bankData && bankData.balance) {
          let bankBalance = bankData.balance;
          log.debug(stLogTitle + ': bank.balance', bankBalance);
          let bankName = bankData.name;
          log.debug(stLogTitle + ': bank.name', bankName);
          let bankNumber = bankData.number;
          log.debug(stLogTitle + ': bank.number', bankNumber);

          // Build the Bank Label (this is the label used for the Field)
          let bankLabel = `${bankNumber} : ${bankName} Account Balance:`;

          // Add the Bank Balance Field/Display
          // Link in display formatted as:
          //  https://6198441-sb1.app.netsuite.com/app/reporting/reportrunner.nl?acctid=630&reload=T&reporttype=REGISTER

          // Create the Link to Display
          let balText = numberWithCommas(bankBalance);
          let balUrl = `/app/reporting/reportrunner.nl?acctid=${bankAcct}&reload=T&reporttype=REGISTER`;
          let balFieldId = 'custpage_avc_urlballink';
          let balLinkHtml = '';
          balLinkHtml += '<div class="uir-field-wrapper">';
          balLinkHtml += `<span id="${balFieldId}fs_lbl_uir_label" class="smallgraytextnolink uir-label">`;
          balLinkHtml += `<span id="${balFieldId}_fs_lbl" class="smallgraytextnolink">`;
          balLinkHtml += bankLabel;


          balLinkHtml += '</span></span>';
          balLinkHtml += `<span class="inputreadonly"><a class="dottedlink" href="${balUrl}" target="_blank">${balText}</a></span>`;
          balLinkHtml += '</div>';
          let fileLink = form.addField({
            id: 'custpage_avc_urlballink',
            type: serverWidget.FieldType.INLINEHTML,
            label: bankLabel
          });
          fileLink.defaultValue = balLinkHtml;
          form.insertField({
            field: fileLink,
            nextfield: 'postingperiod'
          });

        }
      }
    }
  } // Only View Mode

}

//@ts-ignore
enum NAccountType {
  Expense = 'Expense',
  LongTermLiability = 'LongTermLiab'
}

function getHideEndingBalCol(slExpense : serverWidget.Sublist) : boolean {
  let stLogTitle = 'getHideEndingBalCol';
  log.debug(`${stLogTitle}: slExpense`, JSON.stringify(slExpense));
  let bHideEndingBalCol = true;   // Default is to HIDE the Ending Balance Column

  // Loop thru Expense Sublist and look for Accounts that Match, to SHOW the Ending Balance Column
  // Get count of line-items

  let lineCount = slExpense.lineCount;
  log.debug(`${stLogTitle}: lineCount:`, lineCount);

  // Loop thru each line item and check Account Type
  for (let iLine=0; iLine < lineCount; iLine++) {
    let lineAcctId = slExpense.getSublistValue({
      id: 'account',
      line: iLine
    });
    log.debug(`${stLogTitle}: lineAcctId:`, lineAcctId);
    let acctType = getAccountType(lineAcctId);
    if (acctType == NAccountType.LongTermLiability) {
      bHideEndingBalCol = false;
      break;
    }
  }

  return bHideEndingBalCol;
}

function checkExpenseEndingBalValues(context: EntryPoints.UserEvent.beforeLoadContext) {
  let stLogTitle = 'checkExpenseEndingBalValues';
  log.debug(stLogTitle + ':context', JSON.stringify(context));

  let form = context.form;

  // Expense Sublist
  let slExpense = form.getSublist({id:NS_BILL_EXPENSE_SUBLIST_ID});
  log.debug(stLogTitle + ':slExpense', JSON.stringify(slExpense));
  let expCount = slExpense.lineCount;

  //let idCustEb = 'custpage_' + NS_BILL_EXPENSE_SUBLIST_ID + '_' + 'avc_htmleb';


  for (let iLine=0; iLine<expCount; iLine++) {
    // Update Existing Ending Balance Field
    let ebvHtml = buildEndingBalanceViewLink(context, iLine);
    slExpense.setSublistValue({
      id: NS_BILL_EXPENSE_SUBLIST_ENDINGBAL_V_ID,
      line: iLine,
      value: ebvHtml
    });

  }

}

export function buildEndingBalanceViewLink(context: EntryPoints.UserEvent.beforeLoadContext , sublistLine: number) : string {
  let stLogTitle = 'buildEndingBalanceViewLink'
  let form = context.form;
  log.debug(`${stLogTitle}: form (${sublistLine}`, JSON.stringify(form));

  // Expense Sublist
  let slExpense = form.getSublist({id:NS_BILL_EXPENSE_SUBLIST_ID});
  log.debug(`${stLogTitle}: slExpense (${sublistLine}`, JSON.stringify(slExpense));

  let lineAcctId = slExpense.getSublistValue({
    id: 'account',
    line: sublistLine
  });

  let sEndingBal = slExpense.getSublistValue( {
    id: NS_BILL_EXPENSE_SUBLIST_ENDINGBAL_ID,
    line: sublistLine
  });
  let cEndingBal = (sEndingBal) ? formatToCurrency(Number(sEndingBal)) : "";

  let bAccountIsLiability = isAccountLiabilityType(lineAcctId);
  let cssMatch = "";
  let statusMark = "";
  let bMatch = false;
  let dataNsTooltip = "";
  if (bAccountIsLiability) {
    [bMatch, dataNsTooltip] = AccountBalanceMatchesEndingBalance(context, sublistLine);
    if (bMatch) {
      // Account Balance Matches Ending Balance Entered
      statusMark = ` ${HTML_CHECK}`;
    } else {
      // Account Balance DOES NOT MATCH Ending Balance Entered
      cssMatch = "avc_sublist_warning";
      statusMark = ` ${HTML_WARNING}`;
    }
  }

  // Now create the Link to put on the page.
  // /app/reporting/reportrunner.nl?reporttype=REGISTER&acctid=1154
  let fileUrl = `/app/reporting/reportrunner.nl?reporttype=REGISTER&acctid=${lineAcctId}`;
  let ebLinkHtml = '';
  ebLinkHtml += `<span align="right">`;
  ebLinkHtml += `<a class="dottedlink ${cssMatch}" target="_blank" data-ns-tooltip="${dataNsTooltip}" href="${fileUrl}" target="_blank">${cEndingBal}${statusMark}</a>`;
  ebLinkHtml += '</span>';

  return ebLinkHtml;
}


// @ts-ignore
function getAccountType(acctId) {
  let stLogTitle = 'getAccountType';
  if (!acctId) return [false, false];
  log.debug(`${stLogTitle}:acctId`, acctId);

  let result = search.lookupFields({
    type: search.Type.ACCOUNT,
    id: acctId,
    columns: ['name', 'number', 'type', 'balance'],
  });
  log.debug(`${stLogTitle}:result`, JSON.stringify(result));
  if (result) {
    let acctType = result.type[0].value;      // To get the Value from lookupFields, deref the Array object and get the .value or .text
    log.debug(`${stLogTitle}:acctType`, acctType);

    return acctType;
  }

  return false;
}


// @ts-ignore
function AccountBalanceMatchesEndingBalance(context: EntryPoints.UserEvent.beforeLoadContext, sublistLine: number) : [boolean, string] {
  let stLogTitle = 'AccountBalanceMatchesEndingBalance';
  let form = context.form;
  log.debug(`${stLogTitle}:form`, form);
  log.debug(`${stLogTitle}:sublistLine`, sublistLine);

  let dataNsTooltip = "";
  let rec = context.newRecord;
  let slExpense = form.getSublist({id:NS_BILL_EXPENSE_SUBLIST_ID});

  let lineAcctId = slExpense.getSublistValue({
    id: 'account',
    line: sublistLine
  });

  let sAmount = slExpense.getSublistValue( {
    id: 'amount',
    line: sublistLine
  });

  let sEndingBal = slExpense.getSublistValue( {
    id: NS_BILL_EXPENSE_SUBLIST_ENDINGBAL_ID,
    line: sublistLine
  });
  log.debug(`${stLogTitle}:Expense.Ending Balance`, sEndingBal);
  let numEndingBal = Number(sEndingBal);

  let subId = rec.getValue('subsidiary');
  let locId = rec.getValue('location');

  // TranDate
  let tranDate = rec.getValue({fieldId: 'trandate'});
  log.debug(`${stLogTitle}:billDate:`, tranDate);
  let tranDateCriteria = format.format({value: tranDate, type: format.Type.DATE});
  log.debug(`${stLogTitle}:billDateCriteria:`, tranDateCriteria);

  // @ts-ignore
  let [sAcctBalance, sAccountText] = getAccountBalance(lineAcctId, subId, locId, tranDateCriteria);


  let numAcctBalance = roundTo(sAcctBalance, 2);
  let numAmount = roundTo(sAmount, 2);
  let numSystemEndingBal = roundTo(numAcctBalance - numAmount, 2);
  log.debug(`${stLogTitle}:numAcctBalance - numAccount = numSystemEndingBal:`, `${numAcctBalance} - ${numAmount} = ${numSystemEndingBal}`);
  if (numSystemEndingBal == numEndingBal) {
    dataNsTooltip = `Internal Balance as of ${tranDateCriteria} of ${formatToCurrency(numSystemEndingBal)} matches ${formatToCurrency(numEndingBal)}`;
    return [true, dataNsTooltip];
  }
  dataNsTooltip = `Internal Balance as of ${tranDateCriteria} of ${formatToCurrency(numSystemEndingBal)} DOES NOT MATCH ${formatToCurrency(numEndingBal)}`
  return [false, dataNsTooltip];
}

// @ts-ignore
function getAccountBalance(acctId, subId, locId, tranDateCriteria) {
  let stLogTitle = 'getAccountBalance';
  if (!acctId) return [false, false];
  log.debug(`${stLogTitle}:acctId`, acctId);

  // Function Scope Vars
  let acctBalResults :  search.Search | false = false;
  // @ts-ignore
  let resultAccount : string = '';
  let resultSumOfAmount : string = '';

  let result = search.lookupFields({
    type: search.Type.ACCOUNT,
    id: acctId,
    columns: ['name', 'number', 'type', 'balance'],
  });
  log.debug(`${stLogTitle}:result`, JSON.stringify(result));
  if (result) {

    let acctType = result.type[0].value;      // To get the Value from lookupFields, deref the Array object and get the .value or .text
    log.debug(`${stLogTitle}:acctType`, acctType);
    if (acctType == NAccountType.LongTermLiability) {
      log.debug(`${stLogTitle}:Liability Acct:`, `${result.number} | ${result.name}`);
      // Get the Account Balance as of the Date of the Current Bill
      // https://stackoverflow.com/questions/40188497/performing-a-sum-or-grouped-query-in-suitescript-2-0
      try {
        const tranSearchColAccount = search.createColumn({ name: 'account', summary: search.Summary.GROUP });
        const tranSearchColAmount = search.createColumn({ name: 'amount', summary: search.Summary.SUM });
        let acctBalSearch = search.create({
          type: search.Type.TRANSACTION,
          columns: [
            tranSearchColAccount,
            tranSearchColAmount
          ],
          filters: [
            ['subsidiary', search.Operator.ANYOF, subId],
            'AND',
            // DO NOT FILTER BY LOCATION - the various AJEs entered by the CPA RARELY have Locations Entered
            // ONLY filter by Subsidiary
            //['location', search.Operator.ANYOF, locId],
            //'AND',
            ['account', search.Operator.ANYOF, acctId],
            'AND',
            ['trandate', search.Operator.BEFORE, tranDateCriteria]
          ]
        });
        //@ts-ignore
        acctBalResults = acctBalSearch.run().getRange({start: 0, end: 1});
        //let acctBalResults = acctBalSearch.run();
        log.debug(`${stLogTitle}:acctBalResults(1)`, JSON.stringify(acctBalResults));

        if (acctBalResults) {
          resultAccount = <string>acctBalResults[0].getText(tranSearchColAccount);
          resultSumOfAmount = <string>acctBalResults[0].getValue(tranSearchColAmount);
        }
      } catch (error) {
        log.error(stLogTitle, error.message);
        log.error(stLogTitle + ':error', JSON.stringify(error));
        return [false, false];
      }
      log.debug(`${stLogTitle}:acctBalResults(2)`, JSON.stringify(acctBalResults));
    }
    return [resultSumOfAmount, resultAccount];
  } else {
    return [false, false];
  }
}


// @ts-ignore
function getFirstAttachedFileIdFields(recordType : string, recordId) : [false | search.Result, number] {
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

// @ts-ignore
function isAccountLiabilityType(acctId) : boolean {
  let stLogTitle = 'isAccountLiabilityType';
  let result = search.lookupFields({
    type: search.Type.ACCOUNT,
    id: acctId,
    columns: ['name', 'number', 'type', 'balance'],
  });
  if (result) {
    let acctType = result.type[0].value;      // To get the Value from lookupFields, deref the Array object and get the .value or .text
    log.debug(`${stLogTitle}:acctType`, acctType);
    if (acctType == NAccountType.LongTermLiability) {
      return true;
    } else {
      return false;
    }
  }
  return false;
}

// Get the Location Fields
// @ts-ignore
function getAvcLocationResult(locId) {
  if (!locId) return false;
  let stLogTitle = 'getAvcLocationResult';
  let dsSearch = search.create({
    type : search.Type.LOCATION,
    columns: [
      'custrecord_avc_default_ap_bankacct'
    ],
    filters: [
      ['internalid', search.Operator.IS, locId]
    ]
  });
  let searchResults = dsSearch.run().getRange({start: 0, end: 1});
  log.debug(stLogTitle, 'searchResults = ' + JSON.stringify(searchResults));
  if (searchResults.length == 1) {
    let objAvcLocResult = searchResults[0];
    log.debug(stLogTitle, 'objAvcLocResult = ' + JSON.stringify(objAvcLocResult));
    return objAvcLocResult;
  }
  return false;
}

// @ts-ignore
function getLocDefaultAPBankAcct(locId) {
  if (!locId) return false;
  log.debug('getLocDefaultAPBankAcct:locId', locId);
  // @ts-ignore
  let stLogTitle = 'getLocDefaultAPBankAcct';
  let locResult = getAvcLocationResult(locId);
  if (locResult) {
    let bankAcct = locResult.getValue('custrecord_avc_default_ap_bankacct');
    log.debug('getLocDefaultAPBankAcct:custrecord_avc_default_ap_bankacct', bankAcct);
    return bankAcct;
  }
  return false;
}

// @ts-ignore
function getBankAccountFields(acctId) {
  if (!acctId) return false;
  log.debug('getBankAccountFields:acctId', acctId);

  let result = search.lookupFields({
    type: search.Type.ACCOUNT,
    id: acctId,
    columns: ['name', 'number', 'balance']
  });
  log.debug('getBankAccountFields:result', JSON.stringify(result));
  if (result) {
    return result;
  } else {
    return false;
  }
}

// @ts-ignore
function getBankAccountBalance(acctId) {
  if (!acctId) return false;

  log.debug('getBankAccountBalance:acctId', acctId);
  let result = search.lookupFields({
    type: search.Type.ACCOUNT,
    id: acctId,
    columns: ['balance']
  });
  log.debug('getBankAccountBalance:balance', result);
  if (result) {
    return result.balance;
  } else {
    return false;
  }
}

// @ts-ignore
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// @ts-ignore
function roundTo(n, place) {
  //return Number(Number(n).toFixed(place));
  return Number(parseFloat(n).toFixed(place));
}

function formatToCurrency(amount : number) : string {
  amount = (typeof amount !== 'undefined' && amount !== null) ? amount : 0;
  return "$" + (amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

//TODO: Move the code below to ClientScript that is added to the page, otherwise this code will NEVER be accessible on the Client
// @ts-ignore
function callCheckEndingBalance() {
  // @ts-ignore
  let context = nlapiGetContext();
  checkEndingBalance(context);
}