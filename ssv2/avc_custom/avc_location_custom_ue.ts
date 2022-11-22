/**
 * avc_test_custom_ue.ts
 *
 * @NScriptName AVC | Location Custom | UE
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations for Location Form - User Event Script *** UNUSED ***
 */

import {EntryPoints} from "N/types";
import log = require('N/log');
// @ts-ignore
import * as avc from "./avc_util";

export function afterSubmit(context: EntryPoints.UserEvent.afterSubmitContext) {

}
export function beforeLoad(context: EntryPoints.UserEvent.beforeLoadContext) {
  // Only run in Create/Edit/Copy/View Modes
  if ([context.UserEventType.CREATE, context.UserEventType.COPY,
    context.UserEventType.EDIT, context.UserEventType.VIEW].includes(context.type)) {
    log.debug('beforeLoad:UserEventType',context.UserEventType);
    //let form = context.form;
    //let subId = context.newRecord.getValue('subsidiary');
  }

  log.debug('beforeLoad:type', context.type);
  log.debug('beforeLoad:form', JSON.stringify(context.form));
  log.debug('beforeLoad:context', JSON.stringify(context));
}
export function beforeSubmit(context: EntryPoints.UserEvent.beforeSubmitContext) {
}


