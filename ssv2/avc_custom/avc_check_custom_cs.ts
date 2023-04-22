/**
 * avc_check_custom_cs.ts
 *
 * @NScriptName AVC | Check Custom | CS
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations to Write Check Form - Client Script
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
//import search = require("N/search");
//import {LookupValueObject} from "N/search";
// @ts-ignore
import format = require("N/format");
// @ts-ignore
import * as avc from "./avc_util";

//TODO: Fix postSourcing & fieldChanged section. This is BROKEN and isn't working. Make it like avc_vbillpmt_custom.

export let postSourcing: EntryPoints.Client.postSourcing = (context: EntryPoints.Client.postSourcingContext) => {
    // @ts-ignore
    log.debug('postSourcing', `context.fieldId: ${context.fieldId}`);

    /*
    // PAYEE / Entity field
    if (context.fieldId == 'entity') {
        try {
            // Set Default Subsidiary to AVC
            log.debug('postSourcing:context.currentRecord', JSON.stringify(context.currentRecord));
            let cRecord = context.currentRecord;
            let defaultSubId = 2; // American Village Corp
            log.debug('postSourcing', `Set Subsidiary to: ${defaultSubId}`)
            cRecord.setValue({fieldId: 'subsidiary', value: defaultSubId});
        }
        catch (e) {
            log.error('Error Processing postSourcing:entity - ' + e.name, e.message);
            log.error('Error Processing postSourcing:entity - ' + e.name + ' stacktrace:', e.stack);
        }
    }
    */

    // SUBSIDIARY field
    // Everything from here down is broken.
    // if (context.fieldId == 'subsidiary') {
    //     //debugger;
    //     log.debug('postSourcing:context.currentRecord', JSON.stringify(context.currentRecord));
    //     let cRecord = context.currentRecord;
    //     let subId = cRecord.getValue({fieldId: 'subsidiary'});
    //     log.debug('postSourcing:subsidiary', subId);
    //     // Load the Subsidiary Record and see if there is a Default Location
    //     /*
    //     let defaultLoc = search.lookupFields({
    //       type: search.Type.SUBSIDIARY,
    //       id: subId,
    //       columns: ['custrecord_avc_default_loc']
    //     });
    //     log.debug('postSourcing:sub.defaultLoc', defaultLoc);
    //     let locationId = defaultLoc.custrecord_avc_default_loc;
    //     */
    //     let defaultLocId = avc.getDefaultLocId(subId);
    //     log.debug('postSourcing:sub.defaultLocId', defaultLocId);
    //
    //     // Found a Default Location, now set the Location to that Default
    //     if (defaultLocId) {
    //         log.debug('postSourcing', `Set Location to: ${defaultLocId}`)
    //         cRecord.setValue({fieldId: 'location', value: defaultLocId});
    //     }
    // } // SUBSIDIARY

} // POSTSOURCING


export let fieldChanged: EntryPoints.Client.fieldChanged = (context: EntryPoints.Client.fieldChangedContext) => {

    /*
    let stLogTitle = 'fieldChanged';
    log.debug(stLogTitle + ':context', JSON.stringify(context));

    if (['location'].includes(context.fieldId)) {
        let cRecord = context.currentRecord;
        log.debug(stLogTitle + ':cRecord', JSON.stringify(cRecord));

        // If we have a Location, get the Default Bank Acct for that Location and Set the Default Bank Acct,
        // Check if Create or Edit to detemrine whether to set.
        let locId = cRecord.getValue({fieldId: 'location'});
        if (locId) {
            let defBankAcct = avc.getLocDefaultAPBankAcct(locId);
            if (defBankAcct) {
                // set the Account to the Location Default - We set it NO MATTER WHAT if the Location is Changed
                cRecord.setValue({fieldId: 'account', value: defBankAcct});
            }
        }
    }
    */

} // FIELDCHANGED