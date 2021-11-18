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
//import search = require("N/search");
import serverWidget = require('N/ui/serverWidget');

export function beforeLoad(context: EntryPoints.UserEvent.beforeLoadContext) {
  // Only run in Create/Edit/Copy/View Modes
  if ([context.UserEventType.CREATE, context.UserEventType.COPY,
    context.UserEventType.EDIT, context.UserEventType.VIEW].includes(context.type)) {
    log.debug('Before Load', context.type);

    //let newRec = context.newRecord;
    let form = context.form;
    let slExpense = form.getSublist({id:'expense'});
    // Remove Columns from the Expense Sublist that we don't need
    //slExpense.getField({id: 'category'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
    slExpense.getField({id: 'department'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
    slExpense.getField({id: 'class'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN})
  }
}