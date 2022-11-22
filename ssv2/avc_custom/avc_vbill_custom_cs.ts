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

export let postSourcing: EntryPoints.Client.postSourcing = (context: EntryPoints.Client.postSourcingContext) => {
  // @ts-ignore
  log.debug('postSourcing', `context.fieldId: ${context.fieldId}`);

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
  log.debug('fieldChanged', JSON.stringify(context));

  if (['trandate', 'location', 'memo'].includes(context.fieldId)) {
    updateTranId(context);
  }

} // FIELDCHANGED

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

