// IMPORTS
import log = require('N/log');
// @ts-ignore
import record = require('N/record');
import query = require('N/query');
import {Query} from "N/query";
// @ts-ignore
import {url, file, format, error, search} from 'N';
import {Type} from "N/record";


// INTERFACES
export interface ObjSql {
	recordCount: number,
	time: number,
	records: Array<{ [fieldId: string]: string | boolean | number | null }>,
	resultSet?: query.ResultSet
}

// DATABASE FUNCTIONS

// @ts-ignore
export function getVendorList(asLinks? : boolean = false): ObjSql {
	let stLogTitle = 'getVendorList';
	log.debug(`${stLogTitle}:asLinks`, asLinks);

	// @ts-ignore
	let qryList = getResultByQueryId('custdataset_avc_ds_vendorloc');
	let qryVendorList = processList(qryList, asLinks);

/*
	let rSet = qryVendorsList.resultSet;
	// Loop thru each result in resultSet.results and Fill as needed
	// NOTE: We MUST pass in the Index since assigning to the passed variable will NOT work, we MUST assign to qryVendorList...
	rSet.results.forEach( (result, indexR) => {
		let values = result.values
		values.forEach( (value, indexV) => {
			let vType = rSet.types[indexV];
			let cAlias = rSet.columns[indexV].alias;

			// Fix Values if this field is a Token field (begin/ends with [])
			if ((value || '').toString().startsWith('[') && (value || '').toString().endsWith(']')) {
				// Token String - fill with function result
				log.debug('getVendorList:value1', `${indexR}|${value}`);
				let newValue = getTokenValue(value, asLinks);
				//value = "FILLED"; // this will NOT work
				rSet.results[indexR].values[indexV] = newValue;
			}

			// Fix Values based upon Column Alias
			switch (cAlias) {
				case 'companyname':
					// Only update if asLinks = True
					if (asLinks) {
						let newValue = getCompanyUrl(values);
						rSet.results[indexR].values[indexV] = newValue;
					}
					break;
			}

			// Fix Values based upon Value Type
			switch (vType) {
				case 'PERCENT':
					let percent = <number>value;
					const displayPercent = `${(percent * 100).toFixed(2)}%`;
					rSet.results[indexR].values[indexV] = displayPercent;
					break;
				case 'CURRENCY':
					let currency = <number>value;
					//const displayCurrency = currency.toLocaleString("en-US", { style: "currency", currency: "USD"});
					const displayCurrency = formatToCurrency(currency);
					rSet.results[indexR].values[indexV] = displayCurrency;
					log.audit(`getVendorList:Format Currency (r:${indexR} | v:${indexV})`, `before: ${currency}, after:${displayCurrency}`);
					break;
			}
		})
	});
	// Now that we have updated the ResultSet, we need to update the Mapped object ** NOTE: This does NOT work ** - it leaves
	//  the records with the OLD versions. Not sure if the asMapped() is cached or what.
	let records = qryVendorsList.resultSet.asMappedResults();
	log.debug('getVendorList:rSet.records', JSON.stringify(records));
	qryVendorsList.records = records;

	log.debug('getVendorList:rSet.results', JSON.stringify(rSet.results));
*/

	return qryVendorList;
} // GETVENDORLIST


// @ts-ignore
export function getOwnerList(asLinks? : boolean = false): ObjSql {
	let stLogTitle = 'getOwnerList';
	log.debug(`${stLogTitle}:asLinks`, asLinks);

	// @ts-ignore
	let qryList = getResultByQueryId('custdataset_avc_ds_vendorloc_owner');
	let qryOwnerList = processList(qryList, asLinks);

	return qryOwnerList;
}


// @ts-ignore
export function processList(sqlList : ObjSql, asLinks : boolean = false): ObjSql {
	let stLogTitle = 'processList';
	log.debug(`${stLogTitle}:asLinks`, asLinks);

	let rSet = sqlList.resultSet;
	// Loop thru each result in resultSet.results and Fill as needed
	// NOTE: We MUST pass in the Index since assigning to the passed variable will NOT work, we MUST assign to qryVendorList...
	rSet.results.forEach( (result, indexR) => {
		let values = result.values
		values.forEach( (value, indexV) => {
			let vType = rSet.types[indexV];
			let cAlias = rSet.columns[indexV].alias;

			// Fix Values if this field is a Token field (begin/ends with [])
			if ((value || '').toString().startsWith('[') && (value || '').toString().endsWith(']')) {
				// Token String - fill with function result
				log.debug(`${stLogTitle}:value1`, `${indexR}|${value}`);
				let newValue = getTokenValue(value, asLinks);
				//value = "FILLED"; // this will NOT work
				rSet.results[indexR].values[indexV] = newValue;
			}

			// Fix Values based upon Column Alias
			switch (cAlias) {
				case 'companyname':
					// Only update if asLinks = True
					if (asLinks) {
						let newValue = getCompanyUrl(values);
						rSet.results[indexR].values[indexV] = newValue;
					}
					break;
			}

			// Fix Values based upon Value Type
			switch (vType) {
				case 'PERCENT':
					let percent = <number>value;
					const displayPercent = `${(percent * 100).toFixed(2)}%`;
					rSet.results[indexR].values[indexV] = displayPercent;
					break;
				case 'CURRENCY':
					let currency = <number>value;
					//const displayCurrency = currency.toLocaleString("en-US", { style: "currency", currency: "USD"});
					const displayCurrency = formatToCurrency(currency);
					rSet.results[indexR].values[indexV] = displayCurrency;
					log.audit(`${stLogTitle}:Format Currency (r:${indexR} | v:${indexV})`, `before: ${currency}, after:${displayCurrency}`);
					break;
			}
		})
	});
	// Now that we have updated the ResultSet, we need to update the Mapped object ** NOTE: This does NOT work ** - it leaves
	//  the records with the OLD versions. Not sure if the asMapped() is cached or what.
	let records = sqlList.resultSet.asMappedResults();
	log.debug(`${stLogTitle}:rSet.records`, JSON.stringify(records));
	sqlList.records = records;

	log.debug(`${stLogTitle}:rSet.results`, JSON.stringify(rSet.results));
	return sqlList;
}

// @ts-ignore
export function getResultFromQuery(qry: Query) : ObjSql {
	try {
		let beginTime = new Date().getTime();
		let resultSet = qry.run();
		let endTime = new Date().getTime();
		let elapsedTime = endTime - beginTime;

		//let results = resultSet.results;
		log.audit('getResultFromQuery:resultSet.columns', JSON.stringify(resultSet.columns));
		log.audit('getResultFromQuery:resultSet.types', JSON.stringify(resultSet.types));
		log.debug('getResultFromQuery:resultSet.results', JSON.stringify(resultSet.results));
		let records = resultSet.asMappedResults();
		log.debug('getResultFromQuery:records', JSON.stringify(records));


		let objSQL = {
			recordCount: records.length,
			time: elapsedTime,
			records: records,
			resultSet: resultSet
		}
		return objSQL;
	} catch (e) {
		return e + e.stack;
	}
}

// @ts-ignore
export function getResultByQueryId(qryId: string): ObjSql {
	try {
		let qry = query.load({
			id: qryId
		});

		return getResultFromQuery(qry);
	} catch (e) {
		return e + e.stack;
	}
}

// @ts-ignore
export function getResultFromQueryString(qrySql: string): ObjSql {
	try {
		let beginTime = new Date().getTime();
		let qryResults = query.runSuiteQL({
				query: qrySql
			}
		);

		let endTime = new Date().getTime();
		let elapsedTime = endTime - beginTime;

		let results = qryResults.results;
		log.debug('getResultFromQueryString:results', JSON.stringify(results));
		let records = qryResults.asMappedResults();
		log.debug('getResultFromQueryString:records', JSON.stringify(records));

		let objSQL = {
			recordCount: records.length,
			time: elapsedTime,
			records: records
		}
		return objSQL;
	} catch (e) {
		return e + e.stack;
	}
}


// TOKEN FUNCTIONS

// @ts-ignore
export function getTokenValue(strToken : any, asLinks? : boolean = false) : any {
	// Ensure strToken is a String
	let str = (strToken || '').toString();

	// Remove the first and last brackets. Tokens look like this: "[function,arg]"
	str = str.slice(1,-1);

	// Get the Function to Call & Args
	let [fName, id] = str.split(',');
	log.debug('getTokenValue:fName,id', `${fName},${id}`);

	let retVal = '';
	switch (fName) {
		case 'getKeyPrincipalText':
			retVal = getKeyPrincipalText(id, asLinks);
			break;
		case 'getKeyPrincipalAddressText' :
			retVal = getKeyPrincipalAddressText(id);
			break;
		case 'getSignerNamesText' :
			retVal = getSignerNamesText(id, asLinks);
			break;
		default:
			retVal = 'DEFAULT';
			break;
	}

	log.debug('getTokenValue:retVal', `${retVal}`);
	return retVal;
}

// @ts-ignore
export function getKeyPrincipalText(vendId: string, asLinks? : boolean = false) {
	// Format:
	//  1. <Owner-1> (%)
	//    <custrecord_avc_o_eo_name> (if non-blank)
	//  2. <Owner-2> (%)
	//    <custrecord_avc_o_eo_name> (if non-blank)

	let stLogTitle = "getKeyPrincipalText";
	let qryId = 'custdataset_avc_ds_vendorloc_owner';
	let qry = query.load({
		id: qryId
	});
	let condition = qry.createCondition({
		fieldId: 'id',
		operator: query.Operator.EQUAL,
		values: vendId
	})
	qry.condition = condition;

	let qryOwners = getResultFromQuery(qry);
	let records = qryOwners.records
	log.debug(`${stLogTitle}:records`, JSON.stringify(records));
	let retArr = new Array();
	let eoNames: string;
	records.forEach((rec, index) => {
		// Build Principal Name
		// https://app/common/custom/custrecordentry.nl?rectype=<rectype-id>&id=<rec-id>
		let pName = (rec.name || '').toString();
		let pNameText = '';
		if (asLinks) {
			const pNameUrl = url.resolveRecord({
				recordType: 'customrecord_avc_owner',
				recordId: <number>rec.custrecord_avc_lo_ownerid,
				isEditMode: false
			});
			log.debug(`${stLogTitle}:pNameUrl`, pNameUrl);
			pNameText = `<a target="_blank" href="${pNameUrl}">${pName}</a>`
		} else {
			pNameText = pName;
		}
		// Build Percent Ownership
		//const displayPercent = (percent: number = <number>rec.custrecord_avc_lo_ownpc) => `${(percent * 100).toFixed(2)}%`;
		let percent = <number>rec.custrecord_avc_lo_ownpc;
		const displayPercent = `${(percent * 100).toFixed(2)}%`;
		//const eoNames = (names:string = <string>rec.custrecord_avc_o_eo_name) => (names || '').toString().length > 0 ? String.fromCharCode(10) + names : '';
		log.debug(`${stLogTitle}:rec.custrecord_avc_o_eo_name`, rec.custrecord_avc_o_eo_name);
		if ((rec.custrecord_avc_o_eo_name || '').toString().length > 0) {
			eoNames = String.fromCharCode(10) + rec.custrecord_avc_o_eo_name;
		} else {
			eoNames = '';
		}
		retArr.push(`${index+1}. ${pNameText} (${displayPercent})${eoNames}`);
	});
	let retVal = retArr.join(String.fromCharCode(10));
	log.debug(`${stLogTitle}:retVal`, retVal);
	return retVal;
	//return `filled-gKPT:${vendId}`
}

// @ts-ignore
export function getKeyPrincipalAddressText(vendId: string) {
	//  1. <Owner-1> (%)
	//    <custrecord_avc_o_eo_addr> (if non-blank)
	//  2. <Owner-2> (%)
	//    <custrecord_avc_o_eo_addr> (if non-blank)
	// Format:

	let qryId = 'custdataset_avc_ds_vendorloc_owner';
	let qry = query.load({
		id: qryId
	});
	let condition = qry.createCondition({
		fieldId: 'id',
		operator: query.Operator.EQUAL,
		values: vendId
	})
	qry.condition = condition;

	let qryOwners = getResultFromQuery(qry);
	let records = qryOwners.records
	log.debug('getKeyPrincipalAddressText:records', JSON.stringify(records));
	let retArr = new Array();
	let eoAddrs: string;
	records.forEach((rec, index) => {
		//const displayPercent = (percent: number = <number>rec.custrecord_avc_lo_ownpc) => `${(percent * 100).toFixed(2)}%`;
		let pAddr = (rec.custrecord_avc_o_paddr || '').toString().length > 0 ? rec.custrecord_avc_o_paddr : 'Add Link to Principal Here';

		log.debug('getKeyPrincipalAddressText:rec.custrecord_avc_o_eo_name', rec.custrecord_avc_o_eo_name);
		if ((rec.custrecord_avc_o_eo_addr || '').toString().length > 0) {
			eoAddrs = String.fromCharCode(10) + rec.custrecord_avc_o_eo_addr;
		} else {
			eoAddrs = '';
		}
		retArr.push(`${index+1}. ${pAddr}${eoAddrs}`);
	});
	let retVal = retArr.join(String.fromCharCode(10));
	log.debug('getKeyPrincipalAddressText:retVal', retVal);
	return retVal;
	//return `filled-gKPAT:${vendId}`
}

// @ts-ignore
export function getSignerNamesText(vendId: string, asLinks? : boolean = false) {
	// Format:
	//  <signer1>
	//  <signer2>...
	let stLogTitle = "getSignerNamesText";
	const qryId = 'custdataset_avc_ds_vendorloc_signer';
	let qry = query.load({
		id: qryId
	});
	let condition = qry.createCondition({
		fieldId: 'id',
		operator: query.Operator.EQUAL,
		values: vendId
	})
	qry.condition = condition;

	let qrySigners = getResultFromQuery(qry);
	let records = qrySigners.records
	log.debug(`${stLogTitle}:records`, JSON.stringify(records));
	let retArr = new Array();
	records.forEach((rec) => {
		// Build Signer Name
		// https://app/common/custom/custrecordentry.nl?rectype=<rectype-id>&id=<rec-id>
		let sName = (rec.name || '').toString();
		let sNameText = '';
		if (asLinks) {
			const sNameUrl = url.resolveRecord({
				recordType: 'customrecord_avc_owner',
				recordId: <number>rec.custrecord_avc_ls_ownerid,
				isEditMode: false
			});
			log.debug(`${stLogTitle}:sNameUrl`, sNameUrl);
			sNameText = `<a target="_blank" href="${sNameUrl}">${sName}</a>`
		} else {
			sNameText = sName;
		}
		retArr.push(sNameText);
	});
	let retVal = retArr.join(String.fromCharCode(10));
	return retVal;
	//return `filled-gSNT:${vendId}`
}

export function getCompanyUrl(values) : string {
	let stLogTitle = "getCompanyUrl";
	let sCompany = values[1]; // Name is value 1
	const sCompanyUrl = url.resolveRecord({
		recordType: Type.VENDOR,
		recordId: <number>values[0], // ID is value 0
		isEditMode: false
	});
	log.debug(`${stLogTitle}:sCompanyUrl`, sCompanyUrl);
	let sCompanyUrlText = `<a target="_blank" href="${sCompanyUrl}">${sCompany}</a>`
	return sCompanyUrlText

}

// --------------------------------------------------------------------------
// CSV File Generation
// --------------------------------------------------------------------------

export function createBcdAccountList_CSVFile(destFolderId: number) {
	let stLogTitle = 'createBcdAccountList_CSVFile';
	log.debug(stLogTitle, `destFolderId = ${destFolderId}`);

	const now = new Date();
	let csvFilename = 'BCD-AccountList-' + dateToYMD(now, '-').substr(0,10) + '.csv';
	// Get the List/Data to Process
	let vendorList = getVendorList(false);

	let csvFile = createCsvFile(destFolderId, csvFilename, vendorList);

	return csvFile;
}

export function createBcdOwnerList_CSVFile(destFolderId: number) {
	let stLogTitle = 'createBcdOwnerList_CSVFile';
	log.debug(stLogTitle, `destFolderId = ${destFolderId}`);

	const now = new Date();
	let csvFilename = 'BCD-OwnerList-' + dateToYMD(now, '-').substr(0,10) + '.csv';
	// Get the List/Data to Process
	let ownerList = getOwnerList(false);

	let csvFile = createCsvFile(destFolderId, csvFilename, ownerList);

	return csvFile;
}

export function createCsvFile(destFolderId : number, csvFilename : string, dataList : ObjSql) : file.File {
	let stLogTitle = 'createCsvFile';
	log.debug(`${stLogTitle}:destFolderId`, destFolderId);
	log.debug(`${stLogTitle}:csvFilename`, csvFilename);
	log.debug(`${stLogTitle}:dataList`, JSON.stringify(dataList));

	let rs = dataList.resultSet;

	//	let content = new Array();
	let csvCols = [];
	let csvText:string = '';

	// Loop thru Columns to create Headers
	log.debug(stLogTitle, `Columns: ${rs.columns.length}`);
	csvCols = [];
	rs.columns.forEach( (col, cIndex) => {
		log.audit(`${stLogTitle}:Add Header row Column`, JSON.stringify(col));
		csvCols.push(col.label);
	});
	csvText += csvCols.join(',');
	csvText += '\n';

	// Loop thru Values to add data in each row
	log.debug(stLogTitle, `Rows: ${rs.results.length}`);
	rs.results.forEach( (result, rIndex) => { // Loop thru Rows
		log.debug(`${stLogTitle}:Set Values for Row`, JSON.stringify(result));
		csvCols = [];
		result.values.forEach( (value, vIndex) => { // Loop thru Cols/Values in Row
			//let col = rs.columns[vIndex];
			let val = value?.toString() ?? '';
			val = csvEncode(val);
			csvCols.push('"' + val + '"');
		}); // Loop thru Cols in Row
		// Assign csvCols array to Text
		csvText += csvCols.join(',');
		csvText += '\n';
	}); // Loop thru Rows

	// Create the File in the Cabinet
	log.debug(`${stLogTitle}:Value of CSV Output:`, JSON.stringify(csvText));
	log.debug(`${stLogTitle}:Create the File. csvFilename:`, csvFilename);
	let csvFile = file.create({
		name: csvFilename,
		fileType: file.Type.CSV,
		contents: csvText,
		folder: destFolderId
	});
	log.debug(`${stLogTitle}:Save the File. csvFile:`, JSON.stringify(csvFile));
	let csvFileId = csvFile.save();
	// Reload file so I have all the parts I need
	csvFile = file.load( {
		id: csvFileId
	});
	log.debug(`${stLogTitle}:Saved File. csvFile:`, JSON.stringify(csvFile));

	return csvFile;
}

/*
 * We want to have a folder structure like the following:
 * File Cabinet\SuiteApps\avc.vendorloclist\<YYYY>\<ExportName>||<YYYY-MM-DDTHH:mm:ss>\
 * File Names:
 *  Account List: BCD-AccountList-YYYY-MM-DD.csv
 *  Owner List: BCD-OwnerList-YYYY-MM-DD.csv
 *  Signer List: BCD-SignerList-YYYY-MM-DD.csv
 */
export function getDestFolderId(exportName? : string) {
	let stLogTitle = 'getDestFolderId';
	log.debug(stLogTitle, `exportName = ${exportName}`);
	const now = new Date();

	exportName = (typeof exportName !== 'undefined' && exportName.length > 0) ? exportName : dateToYMDHms(now).substr(0,19);
	log.debug(stLogTitle, `exportName (new) = ${exportName}`);

	// Root\
	let sFolderPath = 'SuiteApps\\avc.vendorloclist';

	// Root\YYYY
	let dateStrY = dateToYMD(now, '').substr(0,4);
	log.debug(stLogTitle, `dateStrY = ${dateStrY}`);
	sFolderPath += '\\' + dateStrY;

	// Root\YYYY\exportName||Date
	sFolderPath += '\\' + exportName;
	log.debug(stLogTitle, `sFolderPath = ${sFolderPath}`);

	// Now get the FolderID
	let destFolderId = getFolderIdFromPath(sFolderPath);
	log.debug(stLogTitle, `destFolderId = ${destFolderId}`);

	// Delete any Files in this Folder that match destFilename
	// This isn't necessary. Turns out when I just have to CTRL-R to refresh the PDF file to re-display the New one
	//deleteFile(sFolderPath, destFilename);

	return destFolderId;
}

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

//
// FILE ACCESS

export function buildFolderLink(folderId : number, folderName : string, fieldLabel: string, fieldId: string) : string {
	let stLogTitle = 'buildFolderLink'
	log.debug(stLogTitle, 'folderId = ' + folderId);
	fieldId = typeof fieldId !== 'undefined' ? fieldId : 'custpage_avc_urlfolderlink_' + folderId;

	// Now create the Link to put on the page.
	// /app/common/media/mediaitemfolders.nl?folder=<folder-id>&whence=
	let fileUrl = `/app/common/media/mediaitemfolders.nl?folder=${folderId}&whence=`;
	let fileLinkHtml = '';
	fileLinkHtml += '<div class="uir-field-wrapper">';
	fileLinkHtml += `<span id="${fieldId}fs_lbl_uir_label" class="smallgraytextnolink uir-label">`;
	fileLinkHtml += `<span id="${fieldId}_fs_lbl" class="smallgraytextnolink">`;
	fileLinkHtml += fieldLabel;
	fileLinkHtml += '</span></span>';
	fileLinkHtml += `<span class="inputreadonly"><a class="dottedlink" href="${fileUrl}" target="_blank">${folderName}</a></span>`;
	fileLinkHtml += '</div>';

	return fileLinkHtml;
}

export function buildFileLink(fileObj : file.File, fieldLabel: string, fieldId : string) : string {
	let stLogTitle = 'buildFileLink'
	log.debug(stLogTitle, 'fileObj = ' + JSON.stringify(fileObj));

	fieldId = typeof fieldId !== 'undefined' ? fieldId : 'custpage_avc_urlfilelink_' + fileObj.id;

	// Get values from fileObj
	let fileUrl:string = fileObj.url;
	// @ts-ignore
	let fileId = fileObj.id;
	// @ts-ignore
	let fileName = fileObj.name;
	let fileSizeKb = fileObj.size;

	// Now create the Link to put on the page.
	let fileLinkHtml = '';
	fileLinkHtml += '<div class="uir-field-wrapper">';
	fileLinkHtml += `<span id="${fieldId}fs_lbl_uir_label" class="smallgraytextnolink uir-label">`;
	fileLinkHtml += `<span id="${fieldId}_fs_lbl" class="smallgraytextnolink">`;
	fileLinkHtml += fieldLabel;
	fileLinkHtml += '</span></span>';
	fileLinkHtml += `<span class="inputreadonly"><a class="dottedlink" href="${fileUrl}" target="_blank">${fileName} (${fileSizeKb} KB)</a></span>`;
	fileLinkHtml += '</div>';

	return fileLinkHtml;
}

// @ts-ignore
/*
export function getFileIdFields(recordType : string, recordId) : [false | search.Result, number] {
	if (!recordType || !recordId) return [false, 0];
	let stLogTitle = 'getAttachedFileIds';
	const transactionSearchColFileName = search.createColumn({ name: 'name', join: 'file' });
	const transactionSearchColInternalId = search.createColumn({ name: 'internalid', join: 'file' });
	const transactionSearchColSizeKb = search.createColumn({ name: 'documentsize', join: 'file' });
	const transactionSearchColUrl = search.createColumn({ name: 'url', join: 'file' });
	let dsSearch = search.create({
		type : 'transaction',
		columns: [
			transactionSearchColFileName,
			transactionSearchColInternalId,
			transactionSearchColSizeKb,
			transactionSearchColUrl,
		],
		filters: [
			['mainline', search.Operator.IS, 'T'],
			'AND',
			['type', search.Operator.ANYOF, recordType],
			'AND',
			['internalid', search.Operator.ANYOF, recordId],
		],
	});

	// Get first 1 result only
	let searchResults = dsSearch.run().getRange({start: 0, end: 100});
	log.debug(stLogTitle, 'searchResults = ' + JSON.stringify(searchResults));
	if (searchResults.length >= 1) {
		let fileId = searchResults[0].getValue({name: 'internalid', join: 'file'});
		let attCount:number, objFileFields;
		if (fileId) {
			attCount = searchResults.length;
			objFileFields = searchResults[0];
			log.debug(stLogTitle, 'ObjAvcDsFields = ' + JSON.stringify(objFileFields));
		} else {
			attCount = 0;
			objFileFields = false;
		}
		return [objFileFields, attCount];
	}
	return [false, 0];
}

*/

// ----------------------
// UTILITY
// @ts-ignore
export function formatToCurrency(amount : number) : string {
	return "$" + (amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Returns Date in the Format: YYYY-MM-DD
export function dateToYMD(usDate : Date, sDelim? : string) {
	sDelim = typeof sDelim !== 'undefined' ? sDelim : '-';
	let fmtDate = new Date(usDate.getTime() - (usDate.getTimezoneOffset() * 60000))
		.toISOString().split('T')[0];
	return fmtDate.split('-').join(sDelim);
}

// Returns Date in the Format: YYYY-MM-DDTHH:mm:ss.sssZ
// dDelim: internal delimiter between YYYY<dDelim>MM : Default: -
// jDelim: internal delimiter between <Date><jDelim><Time> : Default: T
// tDelim: internal delimiter between HH<tDelim>mm: Default: :
export function dateToYMDHms(usDate : Date, dDelim : string = '-', jDelim : string = 'T', tDelim : string = ':') {
	//dDelim = typeof dDelim !== 'undefined' ? dDelim : '-';
	//jDelim = typeof jDelim !== 'undefined' ? jDelim : 'T';
	let fmtDateTime = new Date(usDate.getTime() - (usDate.getTimezoneOffset() * 60000))
		.toISOString();
	let fmtDate = fmtDateTime.split('T')[0];
	fmtDate = fmtDate.split('-').join(dDelim);
	let fmtTime = fmtDateTime.split('T')[1];
	fmtTime = fmtTime.split(':').join(tDelim);

	return fmtDate + jDelim + fmtTime;
}

// Fix the Value for Output to CSV File
//  replace <br> with \n
export function csvEncode(val:string) : string {
	let re = /<br>/gi;
	val = val.replace(re, '\n');
	return val;
}