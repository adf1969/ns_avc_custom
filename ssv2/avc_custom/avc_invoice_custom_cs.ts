/**
 * avc_invoice_custom_cs.ts
 *
 * @NScriptName AVC | Invoice Custom | CS
 * @NScriptType ClientScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations to Invoice Form - Client Script
 */

import {EntryPoints} from "N/types";
// @ts-ignore
import log = require('N/log');
// @ts-ignore
import format = require("N/format");
// @ts-ignore
import * as avc from "./avc_util";

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
        let defaultLocId = avc.getDefaultLocId(subId);
        log.debug('postSourcing:sub.defaultLocId', defaultLocId);

        // Found a Default Location, now set the Location to that Default
        if (defaultLocId) {
            log.debug('postSourcing', `Set Location to: ${defaultLocId}`)
            cRecord.setValue({fieldId: 'location', value: defaultLocId});
        }
    } // SUBSIDIARY


} // POSTSOURCING

export let fieldChanged: EntryPoints.Client.fieldChanged = (context: EntryPoints.Client.fieldChangedContext) => {
    log.debug('fieldChanged', JSON.stringify(context));

} // FIELDCHANGED


