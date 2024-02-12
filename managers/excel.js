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
            console.log(sheetName);
            console.log(doc_id);
            if (doc_id !== undefined)
            {
                condition_object.doc_id = new ObjectId(doc_id);
            }
            console.log(condition_object);
            let sheetId = await connection.db("nextERP").collection("sheets").findOne(condition_object);
            return sheetId === null ? false : sheetId;
        } catch (e) {
            console.log(e);
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

        let [_a, sheet, row, column] = matches;
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
            let [_a, sheetName, row, column] = new RegExp(REGEX.fullCoords).exec(coords);

            let sheetId = await sheetExists(sheetName, undefined, undefined);
            let colId = await sheetHasColumn(sheetId._id, column, conn);
            console.log(sheetId);

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
                    let [_a, sheet, row, column] = new RegExp(REGEX.general_fullCoords).exec(hyperlink_coords);
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
                                let newsheetId = db_sheet.data;
                                //create the headers now bro 
                                //headers means the first row of the sheet 
                                
                                //trick to sync the flow 
                                let header_promises = [];

                                worksheet.getRow(1).eachCell((cell)=>{
                                    header_promises.push(
                                        createHeader(newsheetId, undefined, cell.value, "", "", "string", user_id)
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
                                    console.log(ok);
                                    if (ok)
                                    {
                                        let startRow = await getLastRow(newsheetId);

                                        if (startRow?.success === true)
                                        {
                                            startRow = startRow.data.rowId;
                                            let colCount = response.length;
                                            for (let row = 2; row <= worksheet.rowCount; row++)
                                            {
                                                startRow++;
                                                //insert now 
                                                for (let cell = 1;cell <= colCount;cell++)
                                                {
                                                    //insert the cell 
                                                    await createCell(startRow, response[cell - 1].value.data.uuid, "", newsheetId, {}, "string", worksheet.getRow(row).getCell(cell).value, false, "", {}, []);
                                                }

                                            }
                                        }
                                        return {success: true}
                                    }else{
                                        return {success: false, body: "Some errors occured during import!"};
                                    }
                            }else{
                                return {success: false, body: db_sheet?.body || `Sheet called ${sheet.extraData.sheetName} already exists in this document!`};
                            }
                        }catch(e){console.log(e)
                            return {success: false, body: "Some errors occured during import!"};
                        };
                    }   
                    else if (sheet.type == 2)
                    {
                        //logic goes here
                        //first we should get the columns data (id, uuid)
                        let columns_promises = [];
                        for (const [colData_index, colData] of sheet.extraData.columnData.entries())
                        {
                            if (colData.checked === true)
                            {
                                if (colData.selection == 0)
                                {
                                    //create 
                                    columns_promises.push(createHeader(new ObjectId(sheetId), undefined, colData.col_name, "", "", "string", user_id))
                                }else{
                                    //just get the column 
                                    columns_promises.push(dataByGeneral("_id", new ObjectId(colData.selected_id), "headers"));
                                }
                            }else{
                                //fake promise
                                columns_promises.push(
                                    (async ()=>{
                                        return {skip: true}
                                    })()
                                )
                            }
                        }

                        let response_promises = await Promise.allSettled(columns_promises);
                        let startRow = await getLastRow(sheetId);
                        console.log(sheetId);
                        if (startRow?.success === true){
                            //foreach worksheet row, now we can insert 
                            startRow = startRow.data.rowId;
                            for (let row = 2;row <= worksheet.rowCount; row++)
                            {
                                startRow++;
                                //foreach cell 
                                for (let cell = 1;cell <= worksheet.getRow(row).cellCount; cell++)
                                {
                                    //insert 
                                    let header_promise = response_promises[cell-1].value;
                                    console.log(header_promise);
                                    if (header_promise?.skip === true)
                                    {
                                        //do nothing
                                    }else{
                                        //create the cell
                                        await createCell(startRow, header_promise.data.uuid, "", sheetId, {}, "string", worksheet.getRow(row).getCell(cell).value, false, "", {}, []);
                                    }
                                }
                            }
                            return {success: true};
                        }else{
                            return {success: false, body: "Something went wrong!"};
                        }
                        
                    }else{
                        return {success: false, body: "Something went wrong!"};
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

async function  createCell(rowId, uuid, formula, sheetId, styles = {}, type, value, hyperlink = false, hyperlink_coords = "", typeParams = {}, hyperlink_conditions = [])
{
    let connection = await mongo.getConnection();

    if (connection)
    {
        try{
            let obj = {
                rowId,
                uuid,
                formula,
                sheetId: new ObjectId(sheetId),
                styles,
                type, 
                value,
                typeParams
            };

            if (hyperlink)
            {
                obj.hyperlink = hyperlink;
                obj.hyperlink_coords = hyperlink_coords;
                obj.hyperlink_conditions = hyperlink_conditions;
            }
            let insert = await connection.db("nextERP").collection("cells").insertOne(obj);

            if (insert)
            {
                return {success: true, data:{_id: insert.insertedId}}
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

async function getLastRow(sheetId)
{
    let connection = await mongo.getConnection();

    if (connection){
        try{    
            let result = await connection.db("nextERP").collection("cells").find({sheetId: new ObjectId(sheetId)}).sort({rowId: -1}).limit(1).toArray();
            
            if (result && result.length >= 1)
            {
                return {success: true, data: {rowId: result[0].rowId}}
            }else{
                return {success: true, data: {rowId: 0}}
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function remove_column(uuid)
{
    let connection = await mongo.getConnection();

    if (connection){
        //first remove the header 
        try{
            let header_response = await connection.db("nextERP").collection("headers").deleteOne({uuid: uuid});
            if (header_response){
                let cells_response = await connection.db("nextERP").collection("cells").deleteMany({uuid: uuid});

                if (cells_response){
                    return {success: true};
                }else{
                    return {success: false};
                }
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

async function rename_column(uuid, input)
{
    let connection = await mongo.getConnection();

    if (connection){
        //first remove the header 
        try{
            let response = await connection.db("nextERP").collection("headers").updateOne(
                {uuid: uuid},
                {$set:{
                    name: input
                }}
            );

            if (response){
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

async function update_col_notes(uuid, notes)
{
    let connection = await mongo.getConnection();

    if (connection){
        try{    
            let result = await connection.db("nextERP").collection("headers").updateOne(
                {uuid: uuid},
                {$set:{
                    notes: notes
                }}
            );

            if (result){
                return {success: true}
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

async function cellCoords_to_id(cellCoords, insert = false){
    let connection = await mongo.getConnection();

    if (connection !== null)
    {
        try{
            let [_a, sheet, row, column] = new RegExp(REGEX.fullCoords).exec(cellCoords);
            
            let cell_response = await connection.db("nextERP").collection("cells").findOne({
                rowId: parseInt(row),
                sheetId: new ObjectId(sheet),
                uuid: column
            });

            if (cell_response)
            {
                return {success: true, data: {
                    _id: cell_response._id
                }}
            }else{

                if (insert)
                {
                    let c = await createCell(parseInt(row), column, "", sheet, {}, "string", "", false, "", {}, []);
                    return c;
                }

                return {success: false}
            }
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function conditionalFormatting_update(conditions)
{
    if (conditions.length != 0)
    {
        console.log(conditions);
        let connection = await mongo.getConnection();
        
        if (connection !== null)
        {   
            try{
                conditions.forEach((condition)=>{
                    connection.db("nextERP").collection("cells").updateMany(
                        {
                            "conditional_formatting.uuid": condition.uuid
                        },
                        {
                            $set:{
                                "conditional_formatting.$": condition
                            }
                        }
                    );
                })
            }catch(e){
                return ERRORS.MONGO_DB_QUERY;
            }
        }else{
            return ERRORS.MONGO_DB_CONNECTION;
        }
    }else{
        return {success: true}
    }
}

async function conditionalFormatting_add(cells, data)
{
    let update = [], insert = [];
    //add the uuids 
    data.forEach((obj)=>{
        if (obj.uuid == null)
        {
            obj.uuid = uuidv4();
            insert.push(obj);
        }else{
            update.push(obj);
        }   
    })
    conditionalFormatting_update(update);
    //first we should check the nodes coords if they are ok 
    let cells_promises = [];

    cells.forEach((cell)=>{
        cells_promises.push(cellCoords_to_id(cell, true))
    })

    let cells_response = await Promise.allSettled(cells_promises);

    let connection = await mongo.getConnection();
    if (connection === null){
        return ERRORS.MONGO_DB_CONNECTION;
    }
    
    let cells_ids = [];
    cells_response.forEach((cell_response)=>{
        let value = cell_response.value;

        if (value.success === true)
        {
            cells_ids.push(new ObjectId(value.data._id));
        }
    })
    try{
        let response = await connection.db("nextERP").collection("cells").updateMany(
            {
                _id: {
                    $in: cells_ids
                }
            },
            {
                $addToSet:{
                    "conditional_formatting": {
                        $each: insert
                    }
                }
            },
            {
                upsert: true
            }
        );
    
        if (response){
            return {success: true, data};
        }
    
        return {success: false};
    }catch(e){
        return ERRORS.MONGO_DB_QUERY;
    }
}

async function conditionalFormatting_remove(uuid)
{
    let connection = await mongo.getConnection();

    if (connection){
        try{
            let response = await connection.db("nextERP").collection("cells").updateMany(
                {
                    conditional_formatting: {$exists: true}
                },
                { $pull: { "conditional_formatting": { uuid: uuid } } }
            );  
            console.log(response);

            if (response){
                return {success: true};
            }else{
                return {success: false};
            }
        }catch(e){
            console.log(e);
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function conditionalFormatting_wipe(ids){

    let connection = await mongo.getConnection();

    if (connection !== null){
        let object_ids = [];
        ids.forEach((id)=>{
            object_ids.push(new ObjectId(id));
        })

        try{
            let response = await connection.db("nextERP").collection("cells").updateMany(
                {
                    _id: {
                        $in: object_ids
                    }
                },
                {
                    $unset: {
                        conditional_formatting: ''
                    }
                }
            );
            if (response){
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

async function update_headerWidth(uuid, width)
{
    //first check thw width 
    if (parseFloat(width))
    {
        let connection = await mongo.getConnection();

        if (connection){
            try{
                let response = await connection.db("nextERP").collection("headers").updateOne({uuid: uuid},{$set: {width: parseFloat(width)}});
                if (response){
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
    }else{
        return {success: false}
    }
}

module.exports = {
    validFullCoords, sheetExists, sheetHasColumn, validColumnCoords, setHyperlink_cell_coords, setHyperlink_cell_conditions, getDocumentsForUser, getDocument, hyperlink_details, addDocument, getDocumentById, remove_document, remove_sheet, rename_document,
    fullCellCoordsToGeneral, get_all_sheets, import_excel, createSheet, remove_column, rename_column, update_col_notes, conditionalFormatting_add, conditionalFormatting_remove,
    conditionalFormatting_wipe, update_headerWidth
}