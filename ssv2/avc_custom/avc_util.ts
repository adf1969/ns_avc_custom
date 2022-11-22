
// Given a Subsidiary, retrieve that Subsidiary's Default Location Id
import {LookupValueObject} from "N/search";
import {log, search} from "N";


// NetSuite Functions

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

// Utility Functions
// @ts-ignore
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}