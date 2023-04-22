/**
 * avc_vbill_custom_cs.ts
 *
 * @NScriptName AVC | Vendor Bill Custom | CS
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 * Purpose: Purpose: AVC Customizations to Vendor Bill Form - Client Script
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
import search = require("N/search");
import {LookupValueObject} from "N/search";
// @ts-ignore
import format = require("N/format");
// @ts-ignore
import message = require("N/ui/message");

// @ts-ignore
import * as avc from './avc_util';    // For SOME reason, if this is ./avc_util, it BREAKS.

// @ts-ignore
let NS_BILL_EXPENSE_SUBLIST_ID = 'expense';
// @ts-ignore
let NS_BILL_EXPENSE_SUBLIST_ENDINGBAL_ID = 'custcol_avc_ending_bal';
export let postSourcing: EntryPoints.Client.postSourcing = (context: EntryPoints.Client.postSourcingContext) => {
  // @ts-ignore
  log.debug('BEGIN: postSourcing', `context.fieldId: ${context.fieldId}`);

  // SUBSIDIARY field
  if (context.fieldId == 'subsidiary') {
    //debugger;
    log.debug('postSourcing:context.currentRecord', JSON.stringify(context.currentRecord));
    let cRecord = context.currentRecord;
    let subId = cRecord.getValue({fieldId: 'subsidiary'});
    log.debug('postSourcing:subsidiary', subId);
    // Load the Subsidiary Record and see if there is a Default Location
    /*
    let defaultLoc = search.lookupFields({
      type: search.Type.SUBSIDIARY,
      id: subId,
      columns: ['custrecord_avc_default_loc']
    });
    log.debug('postSourcing:sub.defaultLoc', defaultLoc);
    let locationId = defaultLoc.custrecord_avc_default_loc;
    */
    let defaultLocId = getDefaultLocId(subId);
    log.debug('postSourcing:sub.defaultLocId', defaultLocId);

    // Found a Default Location, now set the Location to that Default
    if (defaultLocId) {
      log.debug('postSourcing', `Set Location to: ${defaultLocId}`)
      cRecord.setValue({fieldId: 'location', value: defaultLocId});
      // Since we updated the Location, we need to update the TranId
      updateTranId(context);
    }
  } // SUBSIDIARY

  // VENDOR (entity) field
  if (context.fieldId == 'entity') {
    updateTranId(context);
  }

} // POSTSOURCING

export let fieldChanged: EntryPoints.Client.fieldChanged = (context: EntryPoints.Client.fieldChangedContext) => {
  log.debug('BEGIN: fieldChanged', JSON.stringify(context));

  // Update TranID
  if (['trandate', 'location', 'memo'].includes(context.fieldId)) {
    updateTranId(context);
  }

  // Check Ending Balance against Actual Posted Balance
  if (['custbody_avc_ending_bal'].includes(context.fieldId)) {
    checkEndingBalance(context);
  }

  //TODO: Add checking ending balance when changing the Expense.Account field.
  // Not sure if this belongs in PostSource or here.
  if ((['expense'].includes(context.sublistId)) &&
      (['amount', 'custcol_avc_ending_bal'].includes(context.fieldId))) {
    checkSublistEndingBalance(context);
  }



} // FIELDCHANGED


// Check Ending Balance against Actual Posted Balance
// Sublist id: expense
// Sublist expense Fields:
//    account: Account
//    amount: amount in entry
//
export function checkEndingBalance(context: EntryPoints.Client.fieldChangedContext) {
  let stLogTitle = 'checkEndingBalance';
  log.debug(stLogTitle + ':context', JSON.stringify(context));

  let cRecord = context.currentRecord;
  let sEndingBal:string = cRecord.getValue({fieldId: 'custbody_avc_ending_bal'}).toString();
  log.debug(stLogTitle + ':Ending Balance', sEndingBal);
  let numEndingBal = Number(sEndingBal);

  // Get the list of Expense Records - need to see if any of them are accounts of type Long Term Liability
  let expCount = cRecord.getLineCount({
    sublistId: 'expense',
  });
  if (expCount == 0) {    // There are no Expense Records, do nothing
    return false;
  }
  log.debug(stLogTitle + ':# of Expense Lines', expCount);

  // Subsidiary
  let subId = cRecord.getValue({fieldId: 'subsidiary'});
  log.debug(`${stLogTitle}:subId:`, subId);

  // Location
  let locId = cRecord.getValue({fieldId: 'location'});
  log.debug(`${stLogTitle}:locId:`, locId);

  // TranDate
  let tranDate = cRecord.getValue({fieldId: 'trandate'});
  log.debug(`${stLogTitle}:billDate:`, tranDate);
  let tranDateCriteria = format.format({value: tranDate, type: format.Type.DATE});
  log.debug(`${stLogTitle}:billDateCriteria:`, tranDateCriteria);


  // Loop thru expense Records...looking for those Accounts that are Liability accts
  for (let iLine=0; iLine<expCount; iLine++) {
    let acctId = cRecord.getSublistValue( {
      sublistId: 'expense',
      fieldId: 'account',
      line: iLine
    });
    let sAmount = cRecord.getSublistValue( {
      sublistId: 'expense',
      fieldId: 'amount',
      line: iLine
    });
    log.debug(stLogTitle + ': acctId, amount', `${acctId}, ${sAmount}`);

    // Test Load from avc Module
    //@ts-ignore
    //let test = avc.testFunction(acctId);
    // Is this Account the right type?
    let [sAcctBalance, sAccountText] = getAccountBalance(acctId, subId, locId, tranDateCriteria);
    log.debug(`${stLogTitle}:acctBalance`, JSON.stringify(sAcctBalance));
    log.debug(`${stLogTitle}:sAccountText`, JSON.stringify(sAccountText));
    if (sAcctBalance) {
      // Add to current value in row and compare to Ending Balance variable - they SHOULD match
      let numAcctBalance = Number(sAcctBalance);
      let numAmount = Number(sAmount);
      let numSystemEndingBal = numAcctBalance - numAmount;
      log.debug(`${stLogTitle}:numAcctBalance - numAccount = numSystemEndingBal:`, `${numAcctBalance} - ${numAmount} = ${numSystemEndingBal}`);
      if (numSystemEndingBal == numEndingBal) {
        // MATCH: System Internal Balance & Entered Ending Balance Match
        let myMsg = message.create({
          title: 'Ending Balance Matches',
          message: `System Internal Balance for account ${sAccountText} of: ${formatToCurrency(numSystemEndingBal)} equals entered Ending Balance of:  ${formatToCurrency(numEndingBal)}.`,
          type: message.Type.CONFIRMATION
        });
        myMsg.show({
          duration: 10000 // disappears after 10 sec
        });
      } else {
        // NO MATCH: System Internal Balance & Entered Ending Balance DO NOT MATCH
        let nDelta = numEndingBal - numSystemEndingBal;
        let sMsg = `System Internal Balance for account ${sAccountText} of: ${formatToCurrency(numSystemEndingBal)} DOES NOT equal entered Ending Balance of:  ${formatToCurrency(numEndingBal)}.<br>`;
        sMsg += `Entered Ending Balance is off by: ${formatToCurrency(nDelta)}.`;
        let myMsg = message.create({
          title: 'Ending Balance Does not Match',
          message: sMsg,
          type: message.Type.WARNING
        });
        myMsg.show(); // Show forever.
      }
      // Once we process ONE Liability Acct, Exit the For loop
      break;
    }
  }
}

// Check Ending Balance against Actual Posted Balance
// Sublist id: expense
// Sublist expense Fields:
//    account: Account
//    amount: amount in entry
//
// noinspection DuplicatedCode
export function checkSublistEndingBalance(context: EntryPoints.Client.fieldChangedContext) {
  let stLogTitle = 'checkSublistEndingBalance';
  log.debug(stLogTitle + ':context', JSON.stringify(context));

  let cRecord = context.currentRecord;  // Sublist Record
  log.debug(stLogTitle + ':cRecord', JSON.stringify(cRecord));
  let acctId = cRecord.getCurrentSublistValue({
    sublistId: context.sublistId,
    fieldId: 'account'
  });
  log.debug(stLogTitle + ':acctId', acctId);
  let sAmount:string = cRecord.getCurrentSublistValue({
    sublistId: context.sublistId,
    fieldId: 'amount'
  }).toString();
  log.debug(stLogTitle + ':sAmount', sAmount);
  let numAmount = Number(sAmount);
  let sEndingBal:string = cRecord.getCurrentSublistValue({
    sublistId: context.sublistId,
    fieldId: NS_BILL_EXPENSE_SUBLIST_ENDINGBAL_ID
  }).toString();
  let numEndingBal = Number(sEndingBal);
  log.debug(stLogTitle + ':sEndingBal', sEndingBal);

  // If there is an Amount and an Ending Balance, run a Check
  if ((numAmount != 0) || (numEndingBal != 0)) {
    // Subsidiary
    let subId = cRecord.getValue({fieldId: 'subsidiary'});
    log.debug(`${stLogTitle}:subId:`, subId);

    // Location
    let locId = cRecord.getValue({fieldId: 'location'});
    log.debug(`${stLogTitle}:locId:`, locId);

    // TranDate
    let tranDate = cRecord.getValue({fieldId: 'trandate'});
    log.debug(`${stLogTitle}:billDate:`, tranDate);
    let tranDateCriteria = format.format({value: tranDate, type: format.Type.DATE});
    log.debug(`${stLogTitle}:billDateCriteria:`, tranDateCriteria);

    let [sAcctBalance, sAccountText] = getAccountBalance(acctId, subId, locId, tranDateCriteria);
    log.debug(`${stLogTitle}:acctBalance`, JSON.stringify(sAcctBalance));
    log.debug(`${stLogTitle}:sAccountText`, JSON.stringify(sAccountText));

    if (sAcctBalance) {
      // Add to current value in row and compare to Ending Balance variable - they SHOULD match
      let numAcctBalance = roundTo(sAcctBalance, 2);
      let numAmount = roundTo(sAmount, 2);
      let numSystemEndingBal = roundTo(numAcctBalance - numAmount, 2);
      log.debug(`${stLogTitle}:numAcctBalance - numAccount = numSystemEndingBal:`, `${numAcctBalance} - ${numAmount} = ${numSystemEndingBal}`);
      if (numSystemEndingBal == numEndingBal) {
        // MATCH: System Internal Balance & Entered Ending Balance Match
        let myMsg = message.create({
          title: 'Ending Balance Matches',
          message: `System Internal Balance for account ${sAccountText} of: ${formatToCurrency(numSystemEndingBal)} equals entered Ending Balance of:  ${formatToCurrency(numEndingBal)}.`,
          type: message.Type.CONFIRMATION
        });
        myMsg.show({
          duration: 10000 // disappears after 10 sec
        });
      } else {
        // NO MATCH: System Internal Balance & Entered Ending Balance DO NOT MATCH
        let nDelta = numEndingBal - numSystemEndingBal;
        let sMsg = `System Internal Balance for account ${sAccountText} of: ${formatToCurrency(numSystemEndingBal)} DOES NOT equal entered Ending Balance of:  ${formatToCurrency(numEndingBal)}.<br>`;
        sMsg += `Entered Ending Balance is off by: ${formatToCurrency(nDelta)}.`;
        let myMsg = message.create({
          title: 'Ending Balance Does not Match',
          message: sMsg,
          type: message.Type.WARNING
        });
        myMsg.show(); // Show forever.
      }
    }
  }

}

//@ts-ignore
function getActualBalance(acountId: Number, asOfDate: Date) {

}

// Update the TranId to fit the following Format:
//  YYYY-MM-DD-<Vendor>-<Loc-PropCode>
//  NOTE: Max length of a Ref No is 45 chars
//    Date: comes from trandate
//    Vendor: comes from vendor.custentity_avc_shcode
//    Loc-PropCode: comes from location.custrecord_avc_loc_code
//
function updateTranId(context: EntryPoints.Client.postSourcingContext) {
  log.debug('updateTranId:context.currentRecord', JSON.stringify(context.currentRecord));
  let cRecord = context.currentRecord;
  let iMaxLen = 45;
  //let iSubId = cRecord.getValue({fieldId: 'subsidiary'});
  let sRefNo:string = cRecord.getValue({fieldId: 'tranid'}).toString();
  let dDate = cRecord.getValue({fieldId: 'trandate'});
  let sDate = JSON.stringify(dDate).replace(/\"/g, "");
  let iVendorId = cRecord.getValue({fieldId: 'entity'});
  let iLocId = cRecord.getValue({fieldId: 'location'});
  let sMemo:string = cRecord.getValue({fieldId: 'memo'}).toString();

  log.debug('updateTranId:tranid', sRefNo);
  log.debug('updateTranId:trandate', dDate);
  log.debug('updateTranId:sDate', sDate);
  log.debug('updateTranId:entity/vendor', iVendorId);
  log.debug('updateTranId:location', iLocId);
  log.debug('updateTranId:memo', sMemo);

  if (dDate && iVendorId && iLocId)  {
    // Get Vendor ShCode
    let sVendorShCode = getEntityShCode(iVendorId);
    log.debug('updateTranId:entity.ShCode', sVendorShCode);
    // Get Location Code
    let sLocCode = getLocCode(iLocId);
    log.debug('updateTranId:loc.loccode', sLocCode);

    // Format Date to YYYY-MM-DD from Date which is formatted as: 2022-01-25T06:00:00.000Z
    // This doesn't work. It just returns the default date format, of mm/dd/yyyy
    //    let sDateYMD = format.format({value: dDate, type: format.Type.DATE});
    let sDateYMD = sDate.split('T')[0]; // split on the T in the string

    if (sVendorShCode && sLocCode && sDateYMD) {
      let sDefaultRefNo = `${sDateYMD}-${sVendorShCode}-${sLocCode}`;
      log.debug('updateTranId:default RefNo', sDefaultRefNo);

      // Add the Memo if it begins with +
      let sMemoDef = '';
      if (sMemo.startsWith('+')) {
        sDefaultRefNo = sDefaultRefNo + '-' + sMemo.substring(1, iMaxLen - sDefaultRefNo.length - 1); // -1 to account for '-'
        sMemoDef = '-' + sMemo.substring(1, iMaxLen - sDefaultRefNo.length) // We include the '-' in sMemoDef
      }
      log.debug('updateTranId:default RefNo FINAL', sDefaultRefNo);

      // Build Regex String of all parts BUT the part that is changing
      let sRefNoRegEx = '';
      switch(context.fieldId) {
        case 'trandate':
          sRefNoRegEx = `.*-${sVendorShCode}-${sLocCode}${sMemoDef}`;
          break;
        case 'entity':
          sRefNoRegEx = `${sDateYMD}-.*-${sLocCode}${sMemoDef}`;
          break
        case 'location':
          sRefNoRegEx = `${sDateYMD}-${sVendorShCode}-.*${sMemoDef}`;
          break;
        case 'memo':
          if (sMemoDef) {
            sRefNoRegEx = `${sDateYMD}-${sVendorShCode}-${sLocCode}-.*`;
          }
          break;
      }


      // TODO: We need to check for replacement if:
      //  It is Blank - Done
      //  The Value is a Sub-String of sDefaultRefNo - Done
      //  When building the New String, it looks like the Existing String, with just the current field changed - Done
      log.debug('updateTranId:sRefNo', sRefNo);
      log.debug('updateTranId:sRefNoRegEx', sRefNoRegEx);
      log.debug('updateTranId:sDefaultRefNo.match?:', sDefaultRefNo.match(sRefNoRegEx));
      if (!sRefNo || sDefaultRefNo.includes(sRefNo) || sRefNo.match(sRefNoRegEx)) {
        log.debug('updateTranId:RefNo/tranid is Blank, set to:', sDefaultRefNo);
        cRecord.setValue({fieldId: 'tranid', value: sDefaultRefNo});
      }

    }
  }
} // UPDATETRANID

// Given a Subsidiary, retrieve that Subsidiary's Default Location Id
function getDefaultLocId(subId) {
  if (!subId) return false;
  log.debug('getDefaultLocId:subId', subId);
  let defaultLoc = search.lookupFields({
    type: search.Type.SUBSIDIARY,
    id: subId,
    columns: ['custrecord_avc_default_loc']
  });
  log.debug('getDefaultLocId:sub.defaultLoc', defaultLoc);
  let locationArr = defaultLoc.custrecord_avc_default_loc as Array<LookupValueObject>;
  if (locationArr.length > 0) {
    return locationArr[0].value;
  }
  return false;
}

// Given a Location, retrieve that Location's Prop Location Id
function getLocCode(locId) {
  if (!locId) return false;
  log.debug('getLocCode:locId', locId);
  let result = search.lookupFields({
    type: search.Type.LOCATION,
    id: locId,
    columns: ['custrecord_avc_loc_code']
  });
  log.debug('getLocCode:loc.avc_loc_code', result);
  if (result) {
    return result.custrecord_avc_loc_code;
  } else {
    return false;
  }
}

// Given a Vendor/Entity, retrieve that Entity's Short Code
function getEntityShCode(entityId) {
  if (!entityId) return false;
  log.debug('getEntityShCode:entityId', entityId);
  let result = search.lookupFields({
    type: search.Type.ENTITY,
    id: entityId,
    columns: ['custentity_avc_shcode']
  });
  log.debug('getEntityShCode:entity.custentity_avc_shcode', result);
  if (result) {
    return result.custentity_avc_shcode;
  } else {
    return false;
  }
}


// COMMON UTIL CODE

//@ts-ignore
enum NAccountType {
  Expense = 'Expense',
  LongTermLiability = 'LongTermLiab'
}

// @ts-ignore
function roundTo(n, place) {
  //return Number(Number(n).toFixed(place));
  return Number(parseFloat(n).toFixed(place));
}

// @ts-ignore
function formatToCurrency(amount : number) : string {
  amount = (typeof amount !== 'undefined' && amount !== null) ? amount : 0;
  return "$" + (amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

//@ts-ignore
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
