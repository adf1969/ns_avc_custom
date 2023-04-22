/**
 * avc_check_custom_ue.ts
 *
 * @NScriptName AVC | Check Custom | UE
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations to Write Check Form - User Event Script
 */

import {EntryPoints} from "N/types";
import log = require('N/log');
//import search = require("N/search");
// @ts-ignore
import serverWidget = require('N/ui/serverWidget');
//import record = require('N/record');
// @ts-ignore
import * as avc from "./avc_util";

export function beforeLoad(context: EntryPoints.UserEvent.beforeLoadContext) {
    let stLogTitleBase = 'beforeLoad';
    log.debug(stLogTitleBase, `context.type = ${context.type}`);

    // Only run in View Mode
    if ([context.UserEventType.VIEW].includes(context.type)) {
        log.debug(stLogTitleBase, context.type);
        let form = context.form;
        log.debug(stLogTitleBase + ':context.form', JSON.stringify(form));
        let rec = context.newRecord
        //log.debug(stLogTitle + ':context.newRecord', JSON.stringify(rec));

        // @ts-ignore
        let newFld = avc.addClearedDisplayField(form, rec);
    }

    // Only run in Create/Edit/Copy/View Modes
    // This is handled by a custom form modification. I don't have to do this here.
    /*
    if ([context.UserEventType.CREATE, context.UserEventType.COPY,
        context.UserEventType.EDIT, context.UserEventType.VIEW].includes(context.type)) {
        let stLogTitle = stLogTitleBase + ":Hide Unused Fields";
        log.debug(stLogTitle, `context.type = ${context.type}`);

        //let newRec = context.newRecord;
        let form = context.form;
        let slExpense = form.getSublist({id: 'expense'});
        // Remove Columns from the Expense Sublist that we don't need
        slExpense.getField({id: 'department'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
        slExpense.getField({id: 'class'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
    }
    */


    // Only run in Copy Modes and if Memorized Transaction (parameters['memdoc'] exists)
    /* This doesn't work for Bulk Processing, so not using it.
    if ([context.UserEventType.COPY].includes(context.type) &&
        'memdoc' in context.request.parameters) {
        let stLogTitle = stLogTitleBase + ":Clear Check# Field";
        log.debug(stLogTitle, `context.type = ${context.type}`);
        log.debug(stLogTitle, `context.request.parameters.memdoc = ${context.request.parameters.memdoc}`);
        let memdocId = context.request.parameters.memdoc;

        // If the Mem Tran record Name has a "#" in it, we SKIP blanking out the Check #
        // Get the Memorized Tran Record
        let mtData = avc.getMemorizedTranDefnFields(memdocId);
        if (mtData) {
            let mtName:string = mtData.name.toString();
            log.debug(stLogTitle, `Loaded Memorized Tran. Id = ${memdocId}; Name = ${mtName}`);
            if (mtName.includes("#")) {
                log.debug(stLogTitle, `Memorized Tran Name contains #. Exiting.`);
            } else {
                log.debug(stLogTitle, `Memorized Tran Name !contain #. Clearing Check#/Tranid Field.`);
                let newRec = context.newRecord;
                //let form = context.form;
                newRec.setValue({fieldId: 'tranid', value:''});
            }
        }
    }
    */
}