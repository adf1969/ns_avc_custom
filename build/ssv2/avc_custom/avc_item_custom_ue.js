/**
 * avc_item_custom_ue.ts
 *
 * @NScriptName AVC Item Custom User Event Script
 * @NScriptType UserEventScript
 * @NApiVersion 2.1
 *
 */
define(["N/log", "N/search", "N/ui/serverWidget"], function (log, search, serverWidget) {
    var exports = {};
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.beforeLoad = void 0;
    function beforeLoad(context) {
        // Only run in Create/Edit/Copy/View Modes
        if ([context.UserEventType.CREATE, context.UserEventType.COPY,
            context.UserEventType.EDIT, context.UserEventType.VIEW].includes(context.type)) {
            log.debug('Before Load', context.type);
            var newRec = context.newRecord;
            log.debug('beforeLoad:newRecord', JSON.stringify(newRec));
            //@ts-ignore
            var locFields = newRec.getSublistFields('locations');
            log.debug('beforeLoad:form', JSON.stringify(context.form));
            var form = context.form;
            var tabs = form.getTabs();
            log.debug('beforeLoad:tabs', JSON.stringify(tabs));
            var subLoc = form.getSublist({ id: 'locations' });
            log.debug('beforeLoad:subLoc', JSON.stringify(subLoc));
            // @ts-ignore
            var locData = getLocationData(); // Object of Result, stored by Location.InternalID, ref with locData[<id>]
            // Now Hide any Locations, that don't have an entry in locData
            //let locLines = newRec.getLineCount('locations');
            //subLoc.displayType = serverWidget.SublistDisplayType.HIDDEN;
            //subListRow_UpdateDisplayType(subLoc, 0, serverWidget.FieldDisplayType.HIDDEN, locFields, newRec);
            var newLocSublist = createLocationSublist(form, subLoc, locFields);
            // Add the new Sublist to the Form
            form.insertSublist({ sublist: newLocSublist, nextsublist: 'locations' });
        }
    }
    exports.beforeLoad = beforeLoad;
    function getLocationData() {
        var stLogTitle = 'getLocationData';
        var locSearch = search.create({
            type: search.Type.LOCATION,
            columns: ['internalid', 'name', 'locationtype'],
            filters: ['locationtype', search.Operator.ANYOF, 2] // 2 = Warehouse
        });
        var locResults = locSearch.run().getRange({ start: 0, end: 200 });
        log.debug(stLogTitle, JSON.stringify((locResults)));
        var objData = {}; // same as new Object
        for (var i = 0; i < locResults.length; i++) {
            var result = locResults[i];
            log.debug(stLogTitle, 'result = ' + JSON.stringify(result));
            objData[result.getValue('internalid')] = result;
        }
        return objData;
    }
    // @ts-ignore
    function subListRow_UpdateDisplayType(subList, lineNum, fdType, fieldList, rec) {
        fieldList.forEach(function (item, index) {
            log.debug("sublistRow_UpdateDisplayType", "item: " + item + ", index: " + index);
            var f = rec.getSublistField({
                sublistId: 'locations',
                fieldId: item,
                line: 1
            });
            if (f != null) {
                //f.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
                f.isDisplay = false;
            }
        });
    }
    // @ts-ignore
    function createLocationSublist(form, currLocList, fieldList) {
        var sublist = form.addSublist({
            id: 'custpage_locations_filtered',
            type: serverWidget.SublistType.STATICLIST,
            label: 'Locations Filtered'
        });
        // Add Fields to Sublist
        // Add a field to store the Original Locations sublist Row-Num so we can use
        // it later in the beforeSubmit to set values to save.
        var idField = sublist.addField({
            id: 'original_loc_rownum',
            type: serverWidget.FieldType.TEXT,
            label: 'ID'
        });
        idField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
        // Add the rest of the Fields to the Sublist
        fieldList.forEach(function (item, index) {
            var f = currLocList.getField(item);
            if (f != null && !item.startsWith('sys_')) {
                log.debug('createLocationSublist', "field (" + item + "): " + JSON.stringify(f));
                var fId = f.id;
                var fType = getFieldType(f.type);
                var fLabel = f.label.length ? f.label : ' ';
                log.debug('createLocationSublist:NewField', "fId: " + fId + ", fType: " + fType + ", fLabel: " + fLabel);
                // @ts-ignore
                var newField = sublist.addField({
                    id: fId,
                    type: fType,
                    label: fLabel
                });
            }
        });
        // Add Rows to Sublist
        sublist.setSublistValue({ id: 'preferredstocklevel', value: 50, line: 0 });
        return sublist;
    }
    function getFieldType(type) {
        var retType = serverWidget.FieldType.TEXT;
        switch (type) {
            case 'currency2': {
                retType = serverWidget.FieldType.CURRENCY;
                break;
            }
            case 'text': {
                retType = serverWidget.FieldType.TEXT;
                break;
            }
            case 'float': {
                retType = serverWidget.FieldType.FLOAT;
                break;
            }
            case 'integer': {
                retType = serverWidget.FieldType.INTEGER;
                break;
            }
        }
        return retType;
    }
    return exports;
});
