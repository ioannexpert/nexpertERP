const REGEX = require("../regex");
const mongo = require("../managers/mongoDB");
const ERRORS = require("../errors");
const {ObjectId} = require("mongodb");
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');


async function sheetExists(sheetName, doc_id = undefined, conn = undefined) {
    let connection = conn || await mongo.getConnection();

    if (connection != null) {
        try {
            let condition_object = {sheetName: sheetName};
            if (doc_id !== undefined)
            {
                condition_object.doc_id = new ObjectId(doc_id);
            }
            let sheetId = await connection.db("nextERP").collection("sheets").findOne(condition_object);
            return sheetId === null ? false : sheetId;
        } catch (e) {
            return false;
        }
    } else {
        return false;
    }
}

async function sheetExists_id(sheetId, user_id)
{
    let connection = await mongo.getConnection();

    if (connection){
        try{
            let response = await connection.db("nextERP").collection("sheets").findOne({_id: new ObjectId(sheetId), userId: user_id});

            if (response)
            {
                return {success: true, data: response};
            }else{
                return {success: false, body: "Sheet does not exist!"};
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function sheetHasColumn(sheetId, colName, conn = undefined) {
    let connection = conn || await mongo.getConnection();

    if (connection !== null) {
        let col = await connection.db("nextERP").collection("headers").findOne({ sheetId, name: colName });

        return col === null ? false : col;
    } else {
        return false;
    }
}

async function validFullCoords(coords) {
    if (new RegExp(REGEX.fullCoords).test(coords)) {
        let matches = new RegExp(REGEX.fullCoords).exec(coords);

        let [undefined, sheet, row, column] = matches;
        //now search 
        let connection = await mongo.getConnection();

        if (connection !== null) {
            try {

                let sheetId = await connection.db("nextERP").collection("sheets").findOne({ sheetName: sheet });

                if (sheetId != null) {
                    let cellUUID = await connection.db("nextERP").collection("headers").findOne({ name: column, "sheetId": sheetId._id });
                    if (cellUUID !== null) {
                        //now check the row 
                        let rowId = await connection.db("nextERP").collection("cells").findOne({ rowId: parseInt(row), "sheetId": sheetId._id });
                        if (rowId != null) {
                            //update 
                            //we should insert default if the cell literally does not exist
                            let cellId = await connection.db("nextERP").collection("cells").findOneAndUpdate(
                                {
                                    rowId: parseInt(row),
                                    "sheetId": sheetId._id,
                                    uuid: cellUUID.uuid
                                },
                                {
                                    $setOnInsert: {
                                        rowId: parseInt(row),
                                        uuid: cellUUID.uuid,
                                        formula: null,
                                        styles: {},
                                        value: "",
                                        type: "string"
                                    }
                                },
                                { 
                                    upsert: true,
                                    returnOriginal: false,
                                    returnDocument: 'after',
                                    projection: { _id: 1 }
                                }
                            );

                            return { "success": true, "data": cellId._id };
                        } else {
                            return { "body": `The row index ${row} does not exist in the sheet ${sheet}!` };
                        }
                    } else {
                        return { "body": `The column ${column} does not exist in the sheet ${sheet}!` };
                    }
                } else {
                    return { "body": `The sheet ${sheet} does not exist!` };
                }
            } catch (e) {
                return ERRORS.MONGO_DB_QUERY;
            }
        } else {
            return ERRORS.MONGO_DB_CONNECTION;
        }
    } else {
        return { "body": "The target cell cordinates are not valid!" }
    }
}

async function validColumnCoords(coords) {
    let parts = coords.split("!");
    if (parts.length == 2) {
        let connection = await mongo.getConnection();

        if (connection != null) {
            //cehck sheet 
            let sheetId = await sheetExists(parts[0], undefined);
            if (sheetId !== false) {
                if (await sheetHasColumn(sheetId._id, parts[1], connection)) {
                    return true;
                } else {
                    return { "body": `Sheet ${parts[0]} does not have the column ${parts[1]}!` };
                }
            } else {
                return { "body": `Sheet ${parts[0]} does not exist!` };
            }

        } else {
            return ERRORS.MONGO_DB_CONNECTION;
        }
    } else {
        return { "body": "Coordinates are not valid!" };
    }
}

async function fullCellCoordsToGeneral(coords, conn = null)
{
    let connection = conn || await mongo.getConnection();

    if (connection !== null)
    {
        try{
            let [undefined, sheetName, row, column] = new RegExp(REGEX.fullCoords).exec(coords);
            let sheetId = await sheetExists(sheetName, undefined);
            let colId = await sheetHasColumn(sheetId._id, column, conn);

            return {success: true, data: `!${sheetId._id}#${row}@${colId.uuid}`};
        }catch(e){
            return {success: false}
        }

    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function setHyperlink_cell_coords(refCells, textToDisplay, cellCoord)
{
        //direct cell coord 
        let connection = await mongo.getConnection();
        if (connection !== null) {
            try {
                let generalCoords = await fullCellCoordsToGeneral(cellCoord);
                if (generalCoords?.success !== true)
                    return {success: false};
                let query = await connection.db("nextERP").collection("cells").updateMany(
                    {
                        _id: {
                            $in: refCells
                        }
                    },
                    {
                        $set: {
                            "hyperlink": true,
                            "hyperlink_coords": generalCoords.data,
                            "value": textToDisplay,
                            "type": "string"
                        }
                    },
                    {
                        upsert: false
                    }
                );

                if (query) {
                    return { success: true };
                } else {
                    return ERRORS.MONGO_DB_QUERY;
                }
            } catch (e) {
                return ERRORS.MONGO_DB_QUERY;
            }
        } else {
            return ERRORS.MONGO_DB_CONNECTION;
        }
    
}

async function setHyperlink_cell_conditions(refCells, textToDisplay, conditions = [], target_sheet) {

        let connection = await mongo.getConnection();
        if (connection !== null) {
            try {
                let hyperLink_coords = await runHyperlinkConditions(conditions, connection, await dataByGeneral("_id", refCells[0], "cells", connection), target_sheet);
           
                let query = await connection.db("nextERP").collection("cells").updateMany(
                    {
                        _id: {
                            $in: refCells
                        }
                    },
                    {
                        $set: {
                            "hyperlink": true,
                            "hyperlink_coords": hyperLink_coords?.success !== false ? hyperLink_coords.data : "",
                            "hyperlink_conditions": conditions,
                            "value": textToDisplay,
                            "type": "string"
                        }
                    },
                    {
                        upsert: false
                    }
                );

                if (query) {
                    return { success: true };
                } else {
                    return ERRORS.MONGO_DB_QUERY;
                }
            } catch (e) {
                return ERRORS.MONGO_DB_QUERY;
            }
        } else {
            return ERRORS.MONGO_DB_CONNECTION;
        }
}


function arrange_conditions(headerUUIDS, hyperlink_conditions)
{
    let result = [];

    for (let condition of hyperlink_conditions)
    {
        //search in headerUUIDS for _id = condition 
        for (let uuid of headerUUIDS)
        {
            if (uuid._id.toString() == condition.toString())
            {
                result.push(uuid);
            }
        }
    }
    return result;
}

async function runHyperlinkConditions(hyperlink_conditions, conn = null, currentSheet = null, target_sheet){
    let connection = conn || await mongo.getConnection();
  
    if (connection !== null && currentSheet?.success === true)
    {
        currentSheet = currentSheet.data.sheetId;
        try{    

            //convert to ObjectId 
            for (let i = 0;i<hyperlink_conditions.length;i++)
            {
                hyperlink_conditions[i] = new ObjectId(hyperlink_conditions[i]);
            }
            //get all the header uuis 
            let headerUUIDS = await connection.db("nextERP").collection("headers").find({_id: {$in: hyperlink_conditions}}).toArray();
            headerUUIDS = arrange_conditions(headerUUIDS, hyperlink_conditions);
            //now get the uuids 2 by 2 and compare the cells in the collection 
            let frequency = [];
       
            for (let i = 0;i<headerUUIDS.length;i+=2)
            {
                let arr = await connection.db("nextERP").collection("cells").aggregate([
                    {
                        $match: {
                            uuid: {$in: [headerUUIDS[i].uuid, headerUUIDS[i+1].uuid]}
                        },
                    },
                    {
                        $group: {
                            _id: {value: '$value' },
                            uuids: { $addToSet: {rowId: '$rowId', sheetId: '$sheetId'} },
                            count: { $sum: 1 }
                        },
                    },
                    {
                        $match:{
                            count: {$gt: 1}
                        }
                    }
                ]).toArray();

                if (arr.length != 0)
                    {
                        let [uuid1, uuid2] = arr[0].uuids;
                    
                        if (uuid1 == target_sheet) 
                            {
                                frequency[uuid1.rowId] ? frequency[uuid1.rowId]++ : frequency[uuid1.rowId] = 1;
                            }
                        else{
                            frequency[uuid2.rowId] ? frequency[uuid2.rowId]++ : frequency[uuid2.rowId] = 1;
                        }
                        
                    }
            }

            for (let rowID in frequency)
            {
                if (frequency[rowID] == headerUUIDS.length / 2)
                {
                    console.log("Returned")
                    return {success: true, data: `!${target_sheet}#${rowID}@`};
                }
            }

            return {success: false};

        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}



async function getDocumentsForUser(user_id)
{
    let connection = await mongo.getConnection();

    if (connection != null)
    {   
        try{
            let results = await connection.db("nextERP").collection("documents").find({userId: user_id}).toArray();

            return {success: true, data: results};
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function getDocumentById(doc_id, user_id)
{
    let connection = await mongo.getConnection();

    if (connection !== null)
    {
        try{
            let result = await connection.db("nextERP").collection("documents").findOne({_id: new ObjectId(doc_id), userId: user_id});
            
            if (result != null)
            {
                return {success: true, data: result};
            }else{
                return {success: false};
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function getDocument(doc_name, user_id, conn = null)
{
    let connection = conn || await mongo.getConnection();

    if (connection != null)
    {   
        try{
            let results = await connection.db("nextERP").collection("documents").findOne({userId: user_id, name: doc_name});
            if (results !== null){
                return {success: true, data: results}
            }
            return {success: false};
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
     
}

async function addDocument(doc_name, doc_color, page_id, user_id)
{
    let connection = await mongo.getConnection();
    if (connection !== null){
        let docExists = await getDocument(doc_name, user_id);
        console.log(docExists);
        if (docExists?.success === false)
        {
            //insert it now 
            try{
                let insert = await connection.db("nextERP").collection("documents").insertOne({name: doc_name, color: doc_color, userId: user_id});
                if (insert){
                    return {success: true, _id: insert.insertedId};
                }else{
                    return ERRORS.MONGO_DB_QUERY;
                }
            }catch(e){
                console.log(e);
                return ERRORS.MONGO_DB_QUERY;
            }
        }else{
            return {success: false,body: "A document with this name already exists!"};
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function dataByGeneral(param, value, collection, conn = null)
{
    let connection = conn || await mongo.getConnection();

    if (connection !== null){   

        try{
            let condition = {};
            condition[param] = value;
            let result = await connection.db("nextERP").collection(collection).findOne(condition);
            if (result !== null){
                return {success: true, data: result};
            }else{
                return {success: false}
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }

    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function hyperlink_details(cell_id)
{
    let connection = await mongo.getConnection();

    if (connection !== null){
        try{
            //get the cell 
            let cell_data = await connection.db("nextERP").collection("cells").findOne({_id: new ObjectId(cell_id), hyperlink: true});
            if (cell_data !== null){
                let {hyperlink_coords, conditions} = cell_data;

                if (hyperlink_coords && hyperlink_coords.trim() != ""){
                    //direct coords 
                    let [undefined, sheet, row, column] = new RegExp(REGEX.general_fullCoords).exec(hyperlink_coords);
                    console.log(sheet, row, column);
                    let sheetData = await dataByGeneral("_id", new ObjectId(sheet), "sheets", connection);
                    console.log(sheetData);
                    if (sheetData?.success !== true)
                        return {success: false, body: "Hyperlink is not valid!"};

                    // let colData = await dataByGeneral("uuid", column, "headers",connection);
                    // if (colData?.success !== true)
                    //     return {success: false, body: "Hyperlink is not valid!"};
                    let colData = "";
                    
                        let docData = await getDocumentById(sheetData.data.doc_id, sheetData.data.userId);
                        if (docData?.success !== true)
                        {
                            return {success: false};
                        }
                        let pageData = await pageDate_byId(docData.data.pageId);

                        if (pageData?.success !== true){
                            return {success: false};
                        }

                        return {success: true, sheetId: sheetData.data._id, sheet: sheetData.data.sheetName, row, column: colData?.name || "", doc_id: sheetData.data.doc_id, doc_name: docData.data.name, pageName: pageData.data.pageName};
                    
                }else if (conditions && conditions.length != 0)
                {
                    //conditions matching
                    
                }else{
                    return {success: false, body: "Hyperlink is not valid!"};
                }
            }else{
                return {success: false, body: "This cell is not a hyperlink!"};
            }
        }catch(e){
            console.log(e);
            return ERRORS.MONGO_DB_QUERY
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function pageDate_byId(page_id)
{
    let connection = await mongo.getConnection();

    if (connection !== null)
    {
        try{
            let result = await connection.db("nextERP").collection("pages").findOne({_id: new ObjectId(page_id)});
            if (result){
                return {success: true, data: result}
            }else{
                return {success: false, body: "Page does not exist!"};
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function remove_document(doc_id, user_id)
{
    let connection = await mongo.getConnection();

    if (connection !== null)
    {
        try{
            //parse the sheets first 
            let sheets = await connection.db("nextERP").collection("sheets").find({doc_id: new ObjectId(doc_id), userId: parseInt(user_id)}).toArray();
            let response = await connection.db("nextERP").collection("documents").deleteOne({_id: new ObjectId(doc_id),userId: parseInt(user_id)});

            if (response){
                try{
                    sheets.forEach((sheet)=>{
                        remove_sheet(sheet._id, user_id);
                    })
                }catch(e){}

                return {success: true}
            }else{
                return ERRORS.MONGO_DB_QUERY;
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function remove_sheet(sheetId, user_id)
{
    let connection = await mongo.getConnection();

    if (connection)
    {
        try{
            let sheets = await connection.db("nextERP").collection("sheets").deleteMany({_id: new ObjectId(sheetId), userId: user_id});
            if (sheets && sheets.deletedCount >= 1)
            {
                await connection.db("nextERP").collection("cells").deleteMany({sheetId: new ObjectId(sheetId)});
                await connection.db("nextERP").collection("headers").deleteMany({sheetId: new ObjectId(sheetId)});
                return {success: true};
            }else{
                return {success: false}
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;                
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function rename_document(doc_id, user_id, doc_name)
{
    let connection = await mongo.getConnection();

    if (connection !== null)
    {
        try{
            let response = await connection.db("nextERP").collection("documents").updateOne(
                {
                    _id: new ObjectId(doc_id),
                    userId: parseInt(user_id)
                },
                {
                    $set: {
                        name: doc_name
                    }
                },
                {
                    upsert: false
                }
            );

            if (response)
            {
                return {success: true};
            }else{
                return {success: false};
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function get_all_sheets(userId)
{
    let connection = await mongo.getConnection();

    if (connection){
        try{
            const sheets = await connection.db("nextERP").collection("sheets").aggregate([
                {
                  $match: {
                    userId: userId // Match sheets with the provided userId
                  }
                },
                {
                  $lookup: {
                    from: 'documents',
                    localField: 'doc_id',
                    foreignField: '_id',
                    as: 'document'
                  }
                },
                {
                  $unwind: '$document' // Unwind to access the document fields
                },
                {
                  $lookup: {
                    from: 'pages',
                    localField: 'document.pageId',
                    foreignField: '_id',
                    as: 'page'
                  }
                },
                {
                  $unwind: '$page' // Unwind to access the page fields
                },
                {
                  $project: {
                    sheetName: 1,
                    _id: 1,
                    'document.name': 1,
                    'page.pageName': 1,
                    'document._id': 1
                  }
                }
              ]).toArray();

              return {success: true, data: sheets};
          
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function import_excel(data, sheetId, doc_id, user_id, file_path)
{
    let connection = await mongo.getConnection();

    if (connection)
    {
        try{
            //check the document 
            let doc_data = await getDocumentById(doc_id, user_id);

            if (doc_data?.success === true)
            {
                try{
                    
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.readFile(file_path);
                    
                //workbook object 
                //start getting the data for each sheet 
                for (const [index, sheet] of data.sheets.entries())
                {
                    console.log(sheet);
                    //get the worksheet object  
                    let worksheet = workbook.getWorksheet(index + 1 );
                        
                    if (sheet.type == 0)
                    {
                        //just skip
                    }else if (sheet.type == 1)
                    {
                        //first create 
                        try{
                            let db_sheet = await createSheet(sheet.extraData.sheetName, "", user_id, doc_id);
                            if (db_sheet?.success === true)
                            {
                                console.log("Sheet created");
                                //create the headers now bro 
                                //headers means the first row of the sheet 
                                
                                //trick to sync the flow 
                                let header_promises = [];

                                worksheet.getRow(1).eachCell((cell)=>{
                                    header_promises.push(
                                        createHeader(sheetId, undefined, cell.value, "", "", "string", user_id)
                                    )
                                })

                                const response = await Promise.allSettled(header_promises);
                                    //check the response
                                    let ok = true; 
                                    for (const resp of response)
                                    {
                                        if (resp.status !== "fulfilled" || resp.value?.success === false)
                                        {
                                            ok = false;
                                        }
                                    }

                                    if (ok)
                                    {
                                        let colCount = response.length;
                                        for (let row = 2; row <= worksheet.rowCount; row++)
                                        {
                                            //insert now 
                                            for (let cell = 1;cell <= colCount;cell++)
                                            {
                                                //insert the cell 
                                                console.log(response[cell - 1].value)
                                            }

                                        }
                                    }else{
                                        console.log("Stop ")
                                    }
                            }
                        }catch(e){console.log(e)};
                    }   
                }

            }catch(e){
                console.log(e);
                    return {success: false, body: "The file could not be processed!"}
                }
                
            }else{
                return {success: false, body: "You do not have permissions to this document!"};
            }
        }catch(e){  
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function createSheet(name, notes, user_id, doc_id)
{
    let connection = await mongo.getConnection();

    if (connection)
    {
        try{
            if (name.trim() != "" && user_id !== undefined && doc_id !== undefined){
                let doc_data = await getDocumentById(doc_id, user_id);
                if (doc_data?.success === true)
                {
                    let is_sheet = await sheetExists(name, doc_id);
                    if (!is_sheet)
                    {
                        //just insert now 
                        let insert = await connection.db("nextERP").collection("sheets").insertOne({
                            sheetName: name, 
                            notes: notes, 
                            userId: user_id,
                            doc_id: new ObjectId(doc_id)
                        });
                        if (insert)
                        {
                            return {success: true, data: insert.insertedId};
                        }else{
                            return ERRORS.MONGO_DB_QUERY;
                        }
                    }else{
                        return {success: false, body: `Sheet ${name} already exists!`};
                    }
                }else{
                    return {success: false, body: "The document does not exist!"};
                }
            }else{
                return {success: false, body: "Data is not complete!"};
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }

    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function createHeader(sheetId, uuid = undefined, name, notes, formula, colType, user_id)
{
    let connection = await mongo.getConnection();

    if (connection)
    {
        try{
            let sheetData = await sheetExists_id(sheetId, user_id);
            if (sheetData?.success === true)
            {
                if (uuid === undefined){
                    uuid = uuidv4();
                }
                //insert 
                let insert = await connection.db("nextERP").collection("headers").insertOne({
                    sheetId: sheetId,
                    name: name, 
                    notes: notes, 
                    uuid: uuid,
                    formula: formula,
                    colType: colType
                });

                if (insert)
                {
                    return {success: true, data:{
                        _id: insert.insertedId,
                        uuid: uuid
                    }}
                }else{
                    return ERRORS.MONGO_DB_QUERY;
                }
            }else{
                return {success: false, body: "Sheet does not exist!"};
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

module.exports = {
    validFullCoords, sheetExists, sheetHasColumn, validColumnCoords, setHyperlink_cell_coords, setHyperlink_cell_conditions, getDocumentsForUser, getDocument, hyperlink_details, addDocument, getDocumentById, remove_document, remove_sheet, rename_document,
    fullCellCoordsToGeneral, get_all_sheets, import_excel, createSheet
}