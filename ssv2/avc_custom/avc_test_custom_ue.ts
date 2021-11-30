/**
 * avc_test_custom_ue.ts
 *
 * @NScriptName AVC | Test Custom | UE
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 *
 * Purpose: AVC Customizations for Testing - User Event Script
 */

import {EntryPoints} from "N/types";
import log = require('N/log');

export function afterSubmit(context: EntryPoints.UserEvent.afterSubmitContext) {
  log.debug('afterSubmit:UserEventType',context.UserEventType);
  log.debug('afterSubmit:context', JSON.stringify(context));
}
export function beforeLoad(context: EntryPoints.UserEvent.beforeLoadContext) {
  log.debug('beforeLoad:UserEventType',context.UserEventType);
  log.debug('beforeLoad:type', context.type);
  log.debug('beforeLoad:form', JSON.stringify(context.form));
  log.debug('beforeLoad:context', JSON.stringify(context));
}
export function beforeSubmit(context: EntryPoints.UserEvent.beforeSubmitContext) {
  log.debug('beforeSubmit:UserEventType',context.UserEventType);
  log.debug('beforeSubmit:context', JSON.stringify(context));
}


