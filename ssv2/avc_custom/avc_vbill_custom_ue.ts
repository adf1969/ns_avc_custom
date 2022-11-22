/**
 * avc_vbill_custom_ue.ts
 *
 * @NScriptName AVC | Vendor Bill Custom | UE
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 *
 * Purpose: Purpose: AVC Customizations to Vendor Bill Form - User Event Script
 */

import {EntryPoints} from "N/types";
import log = require('N/log');
import search = require("N/search");
import serverWidget = require('N/ui/serverWidget');
//import record = require('N/record');

export function beforeLoad(context: EntryPoints.UserEvent.beforeLoadContext) {
  let stLogTitle = 'beforeLoad';
  // Only run in Create/Edit/Copy/View Modes
  if ([context.UserEventType.CREATE, context.UserEventType.COPY,
    context.UserEventType.EDIT, context.UserEventType.VIEW].includes(context.type)) {
    log.debug('Before Load', context.type);

    //let newRec = context.newRecord;
    let form = context.form;
    let slExpense = form.getSublist({id:'expense'});
    // Remove Columns from the Expense Sublist that we don't need
    slExpense.getField({id: 'category'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
    slExpense.getField({id: 'department'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
    slExpense.getField({id: 'class'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
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