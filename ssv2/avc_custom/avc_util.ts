/**
 * avc_util.ts
 *
 * @NApiVersion 2.1
 * @NModuleScope public
 *
 * Purpose: AVC Custom Utility Functions
 */

// Given a Subsidiary, retrieve that Subsidiary's Default Location Id
import {LookupValueObject} from "N/search";
// @ts-ignore
import {log, url, file, format, error, search} from 'N';
import serverWidget = require('N/ui/serverWidget');
import record = require('N/record');

// NetSuite Functions

export function addAvcCustomCSS(form: serverWidget.Form) {
    // avc_custom.css Location:
    //   /SuiteScripts/ssv2/avc_custom/avc_custom.css
    // https://app/common/media/9692?folder=9692
    // https://6198441-sb1.app.netsuite.com/core/media/media.nl?c=6198441_SB1&h=tGV-xxlT_xsLW_4XrErSUdzJqCnZ0mjrAHpjDk0QsvtYf7hv&id=9692&_xt=.css&_xd=T&fcts=20230113080620

    let stLogTitle = 'addAvcCustomCSS';
    log.debug(stLogTitle + ':Form', JSON.stringify(form));
    let fieldId = 'custpage_avc_csslink';

    // If CustomCSS has already been added to the Form, don't re-add it, just return that Field
    let cssLinkFld = getFormField(form, fieldId);
    if (cssLinkFld) {
        log.debug(stLogTitle + ':Custom CSS Exists', JSON.stringify(cssLinkFld));
        return cssLinkFld;
    }

    let cssFilePath = "SuiteScripts/ssv2/avc_custom/avc_custom.css";
    let cssUrl = '';
    let cssFileObj = getFileObjFromPath(cssFilePath);
    if (cssFileObj) {
        log.debug(stLogTitle + ':Found Css FileObj', JSON.stringify(cssFileObj));
        cssUrl = cssFileObj.url;
    } else {
        log.error(stLogTitle + ':Could Not Retrieve File', cssFilePath);
        return;
    }

    let cssLinkHtml = '';
    cssLinkHtml += '<link rel="stylesheet" type="text/css" ';
    cssLinkHtml += `href="${cssUrl}">`;

    cssLinkFld = form.addField({
        id: fieldId,
        type: serverWidget.FieldType.INLINEHTML,
        label: fieldId + '_label' // This is NOT used for INLINEHTML, but IS required, so we MUST set it.
    })
    cssLinkFld.defaultValue = cssLinkHtml;
    log.debug(stLogTitle + 'cssLink', JSON.stringify(cssLinkFld));
    return cssLinkFld;
}

export function getFormField(form: serverWidget.Form, id : string ) : serverWidget.Field {
    let formFld = form.getField(({
        id: id
    }));

    return formFld;
}

// Given a Subsidiary, retrieve the Subsidiary's Default Location ID
export function getDefaultLocId(subId) {
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

// Given a Subsidiary and optional columnList, retrieve the list of columns requested in an Object from that Subsidiary
// Usage:
//  import * as avc from "./avc_util";
//  let subData = avc.getSubsidiaryFields(subId);
//  if (subData && subData.name) {
//     let subName = subData.name;
//  }
export function getSubsidiaryFields(subId: any,
                                    columnList: Array<string> = ['name', 'legalname', 'email', 'fax', 'federalidnumber', 'ssnortin', 'dropdownstate', 'mainaddress_text', 'tranprefix', 'url', 'custrecord_avc_sub_code', 'custrecord_avc_default_loc']) {
    if (!subId) return false;
    log.debug('getSubsidiaryData:subId', subId);
    log.debug('getSubsidiaryData:columnList', columnList);
    let result = search.lookupFields({
        type: search.Type.SUBSIDIARY,
        id: subId,
        columns: columnList
    });
    log.debug('getDefaultLocId:sub.result', result);
    if (result) {
        return result;
    } else {
        return false;
    }
}

// Given a Location, retrieve that Location's Prop Location Id
export function getLocCode(locId) {
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
export function getEntityShCode(entityId) {
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

// Usage:
//  let bankData = getBankAccountFields(bankAcct);
// if (bankData && bankData.balance) {
//    let bankBalance = bankData.balance;
// }
// @ts-ignore
export function getBankAccountFields(acctId) {
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


// Usage:
//  let mtData = getMemorizedTranDefnFields(memdocId);
// if (mtData && mtData.name) {
//    let mtName = bankData.name;
// }

// @ts-ignore
export function getMemorizedTranDefnFields(memdocId) {
    let stLogTitle = 'getMemorizedTranDefnFields';
    if (!memdocId) return false;
    log.debug(stLogTitle + ':memdocId', memdocId);

    let result = search.lookupFields({
        type: search.Type.MEM_DOC,
        id: memdocId,
        columns: ['name', 'action', 'nextdate', 'nexttrandate']
    });
    log.debug(stLogTitle + ':result', JSON.stringify(result));
    if (result) {
        return result;
    } else {
        return false;
    }
}

// Get the Location Fields
// @ts-ignore
export function getAvcLocationResult(locId) {
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
export function getLocDefaultAPBankAcct(locId) {
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
export function addClearedDisplayField(form : serverWidget.Form, rec: Record) {
    let stLogTitle = 'getClearedField';
    let cleared = rec.getValue('cleared');
    log.debug(stLogTitle + ':cleared', cleared);

    // Ensure Custom CSS has been added to Form
    addAvcCustomCSS(form);

    let fieldId = 'custpage_avc_clearedtext';
    let clearedHtml = '';
    clearedHtml += '<div class="avc_view_status">';
    if (cleared == 'T') {
        clearedHtml += 'CLEARED';
    } else {
        clearedHtml += 'OUTSTANDING';
    }
    clearedHtml += '</div>';

    let clearedFldHtml = form.addField({
        id: fieldId,
        type: serverWidget.FieldType.INLINEHTML,
        label: fieldId + '_label' // This is NOT used for INLINEHTML, but IS required, so we MUST set it.
    });
    clearedFldHtml.defaultValue = clearedHtml;
    form.insertField({
        field: clearedFldHtml,
        nextfield: 'tobeprinted'
    });

    return clearedFldHtml;
}

export function testFunction(acctId) {
    return "test";
}

// FILE CABINET UTILITY FUNCTIONS
// -----------------------------------------------------------

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
 * Given a file path like: \Name1\Name2\Name3\File.txt gets the FileId of File.txt
 * NOTE: If any of the folders do NOT exist, it will CREATE them.
 */
// @ts-ignore
export function getFileObjFromPath(sFilePath : string) : file.File {
    let stLogTitle = 'getFileIdFromPath'
    log.debug(stLogTitle, 'sFilePath = ' + sFilePath);
    try {
        let fileObj = file.load({
            id: sFilePath // can put path or Internal ID here
        });
        return fileObj;
    } catch (e) {
        log.error(`${stLogTitle}: Error getting File ID from Path - ` + e.name, e.message);
        log.error(`${stLogTitle}: Error getting File ID from Path - ` + e.name + ' stacktrace:', e.stack);
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


// Utility Functions
// @ts-ignore
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}