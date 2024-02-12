const express = require("express");
const router = express.Router();
const ERRORS = require("../errors");
const REGEX = require("../regex");
const mongo = require("../managers/mongoDB");

const mysql = require("../managers/mysql");

const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require('uuid');
const constants = require("../constants");
const { checkLogin } = require("../middlewares");
const excel_manager = require("../managers/excel");
const multer = require("multer");
const ExcelJS = require('exceljs');


const file_import = multer({ storage: multer.diskStorage({
    destination: function (req, file, cb)
    {
        cb (null, "./imports");
    },
    filename: function (req, file, cb){
        const name = Date.now() + "-"+Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + name)

    }
}) })

router.use(checkLogin);

router.post("/get_sheets",async (req, res)=>{
        let {doc_id} = req.body;

        let connection = await mongo.getConnection();
        if (connection !== null)
        {
            //query all thee sheets 
            try{
                let result = await connection.db("nextERP").collection("sheets").find({userId: 1, doc_id: new ObjectId(doc_id)}).toArray();
                res.send(result);
            }catch(e){
                console.log(e);
                res.status(500).send(ERRORS.MONGO_DB_QUERY);
            }
        }
        else{
            res.status(500).send(ERRORS.MONGO_DB_CONNECTION)
        }
})

router.post("/get_all_sheets", async (req, res)=>{
    let user = req.user;

    let response = await excel_manager.get_all_sheets(user.userId);

    if (response?.success === true){
        res.send(response);
    }else{
        res.status(500).send(response);
    }
})

router.post("/add_sheet",async (req, res)=>{
    const {sheetName, doc_id} = req.body;

    if (doc_id !== undefined)
    {
        let doc_response = await excel_manager.getDocumentById(doc_id, req.user.userId);
        if (doc_response?.success === true)
        {
            if (sheetName !== undefined && sheetName.trim() != "")
            {
                //check for special chars 
                if (REGEX.allowedChars.test(sheetName))
                {
                    //check if unique 
                    let connection = await mongo.getConnection();   
    
                    if (connection!==null)
                    {
                        let sheetNameUQ = await connection.db("nextERP").collection("sheets").findOne({sheetName, doc_id: new ObjectId(doc_id)});
                        
                        if (sheetNameUQ == null){
                            //ok, insert 
                            try{
                                let result = await connection.db("nextERP").collection("sheets").insertOne({
                                    sheetName,
                                    notes: "",
                                    userId: 1,
                                    doc_id: new ObjectId(doc_id)
                                });
                                res.send({"id": result.insertedId.toString()})
                            }catch(e){
                                res.status(500).send(ERRORS.MONGO_DB_QUERY);
                            }
                        }else{
                            res.status(500).send(ERRORS.EXCEL_SHEET_NAME_NOT_UNIQUE);
                        }
                    }else{
                        res.status(500).send(ERRORS.MONGO_DB_CONNECTION);
                    }
                }else{
                    res.status(500).send(ERRORS.EXCEL_SHEET_NAME_NOT_VALID);
                }
            }
            else{
                res.status(500).send(ERRORS.EXCEL_SHEET_NAME_EMPTY);
            }
        }else{
            res.status(500).send({"body": "Invalid document"});
        }
    }
})

router.post("/add_column",async (req, res)=>{
    const {sheetId, name, notes, colType} = req.body;

    if (sheetId != undefined && name != undefined && notes != undefined && colType != undefined && constants.allowed_col_type.indexOf(colType)!=-1)
    {
        let connection = await mongo.getConnection();
        if (connection != null){
            let sheet = await connection.db("nextERP").collection("sheets").findOne({_id: new ObjectId(sheetId)});
            if (sheet){
                //check if name is unique 
                let col = await connection.db("nextERP").collection("headers").findOne({sheetId: new ObjectId(sheetId), name: name});
                if (col)
                {
                    res.status(500).send(ERRORS.EXCEL_HEADER_NOT_UNIQUE);
                }
                else{
                ///insert 
                    let uuid = uuidv4();
                    let document = {
                        sheetId: new ObjectId(sheetId),
                        "name": name,
                        "notes": notes,
                        uuid,
                        formula: "",
                        colType
                    };

                    try{
                        let result = await connection.db("nextERP").collection("headers").insertOne(document);
                
                        if (result.insertedId)
                        {
                            res.send({
                                uuid
                            })
                        }else{
                            res.status(500).send(ERRORS.MONGO_DB_QUERY);
                        }
                    }catch(e){
                        res.status(500).send(ERRORS.MONGO_DB_QUERY);
                    }
                }
            }else{
                console.log("aici")
                res.status(500).send(ERRORS.EXCEL_SHEET_NULL)
            }
        }
        else{
            res.status(500).send(ERRORS.MONGO_DB_CONNECTION)
        }
    }
    else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST)
    }
})

router.post("/get_header", async (req, res)=>{
    const {sheetId} = req.body;

    if (sheetId != null)
    {   
        //parse the header 
        let connection = await mongo.getConnection();
        if (connection)
        {
            const fieldsToExclude = { _id: 0, sheetId: 0};
            let headers = await connection.db("nextERP").collection("headers").find({sheetId: new ObjectId(sheetId)}).project(fieldsToExclude).toArray();
            console.log(headers);
            res.send(headers);
        }
        else{
            res.status(500).send(ERRORS.MONGO_DB_CONNECTION);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/get_all_headers", async (req, res)=>{
    const {sheetId} = req.body;
  
    let connection = await mongo.getConnection();
    if (connection)
    {
        try{

            let arr = [
                {
                  $lookup: {
                    from: 'sheets',
                    localField: 'sheetId',
                    foreignField: '_id',
                    as: 'sheetInfo'
                  }
                },
                {
                  $unwind: '$sheetInfo'
                },
                {
                  $project: {
                    _id: 1,
                    sheetName: '$sheetInfo.sheetName',
                    name: 1,
                    sheetId: 1,
                    uuid: 1
                  }
                }
            ];
            
            if (sheetId !== undefined && sheetId != "")
            {
                let match_obj = {
                    $match: {
                        "sheetId": new ObjectId(sheetId)
                    }
                };
                arr.unshift(match_obj);
            }
            let result = await connection.db("nextERP").collection("headers").aggregate(arr).toArray();
    
              res.send(result);
        }catch(e){
            console.log(e);
            res.status(500).send(ERRORS.MONGO_DB_QUERY);
        }

    }else{
        res.status(500).send(ERRORS.MONGO_DB_CONNECTION);
    }
})

router.get("/test",async (req, res)=>{

    let connection = await mongo.getConnection();
    let document = {
        rowId: 1,
        value: "dan",
        uuid: "9651275c-9b93-4441-80e3-ac456f158ec0",
        styles: {},
        formula: "",
        sheetId: new ObjectId("65452dbfc94b374a7657e54b")
    }
    connection.db("nextERP").collection("cells").insertOne(document);

    res.sendStatus(200);
})

router.post("/parse_rows", async (req, res)=>{
    let {sheetId} = req.body;
    console.log(sheetId);

    if (sheetId != undefined){
        let connection = await mongo.getConnection();
        if (connection){
            let results = await connection.db("nextERP").collection("cells").find({sheetId: new ObjectId(sheetId)}).toArray();
            res.send(results);
        }else{
            res.status(500).send(ERRORS.MONGO_DB_CONNECTION)
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST)  
    }
})

router.post("/saveSheet",async (req, res)=>{
    const {sheetId, data} = req.body;

    if(sheetId != undefined && data != undefined)
    {
        let connection = await mongo.getConnection();
        if (connection)
        {
            let queryObject = [];
            Object.keys(data).forEach((cellCoords)=>{
                console.log(data[cellCoords]);
                let rowId = parseInt(cellCoords.split("@")[0]), headerId = cellCoords.split("@")[1];
                let filter = {rowId, uuid: headerId};
                let update = {
                    $set:{
                        rowId,
                        value: data[cellCoords]?.value || "",
                        uuid: headerId,
                        styles: data[cellCoords].styles,
                        formula: data[cellCoords].formula,
                        sheetId: new ObjectId(sheetId),
                        type: data[cellCoords].type,
                        typeParams: data[cellCoords].typeParams
                    }
                }
                queryObject.push(
                    {
                        updateOne: {
                            filter: filter,
                            update: update,
                            upsert: true
                          }
                      
                    }
                )
            })
            try{
                let result = await connection.db("nextERP").collection("cells").bulkWrite(queryObject);
                res.sendStatus(200);
            }
            catch(e){
                res.status(500).send(ERRORS.MONGO_DB_QUERY);                
            }

        }else{
            res.status(500).send(ERRORS.MONGO_DB_CONNECTION);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/changeSheetName", async (req, res)=>{
    const {sheetId, name} = req.body;

    if (sheetId !== undefined && name !== undefined)
    {
        let connection = await mongo.getConnection();

        if (connection)
        {
            try{
                await connection.db("nextERP").collection("sheets").updateOne({_id: new ObjectId(sheetId)},{$set: {sheetName: name}});
                res.sendStatus(200);
            }catch(e){
                console.log(e);
                res.status(500).send(ERRORS.MONGO_DB_QUERY);                
            }
        }else{
            res.status(500).send(ERRORS.MONGO_DB_CONNECTION);
        }

    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/removeSheet",async (req, res)=>{
    let {sheetId} = req.body;

    if (sheetId !== undefined)
    {
        let response = await excel_manager.remove_sheet(sheetId, req.user.userId);
        if (response?.success === true){
            res.sendStatus(200);
        }else{
            res.status(500).send(response);
        }

    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);

    }
})

router.post("/searchCoords",async (req, res)=>{
    let {input} = req.body;

    if (input !== undefined)
    {   
        //now we should check the input 
        //first check if we are not swarching for sheets 
        console.log(input);
        if (new RegExp(REGEX.fullCoords).test(input)){
            //get the matches 

            let matches = new RegExp(REGEX.fullCoords).exec(input);
            console.log(matches);
            if (matches !== null){
                let [full, sheet, row, col] = matches;
                
                let connection = await mongo.getConnection();

                if (connection !== null)
                {
                    if (!input.includes("#") && !input.includes("@")){
                        //only the sheet 
                        let results = await connection.db("nextERP").collection("sheets").find({"sheetName": {$regex: `^${sheet}`}}).toArray();
                        if (results.length == 0)
                        {
                            res.status(500).send({"err": "No sheets found with this name!"});
                        }else
                        {
                            let response = [];
                            //transform the result 
                            results.forEach((res)=>{
                                response.push(`!${res.sheetName}`);
                            })
                            res.send(response);
                        }
                    }else if (input.includes("#") && !input.includes("@"))
                    {
                        //check the rownum
                        //get the sheetId
                        try{
                            let sheetId = (await connection.db("nextERP").collection("sheets").findOne({"sheetName": sheet}))._id;
                            let rowCheck = await connection.db("nextERP").collection("cells").findOne({"sheetId": sheetId, "rowId": parseInt(row)});
                            if (rowCheck != null)
                            {
                                res.send([`!${sheet}#${row}`]);
                            }else{
                                res.status(500).send({"err": "The sheet row does not exist"});
                            }
                        }catch(e){
                            res.status(500).send({"err":"Sheet does not exist!"});
                        }
                    }else if (input.includes("!") && input.includes("#") && input.includes("@")){
                        //we are searching for column 
                        try{
                            let sheetId = (await connection.db("nextERP").collection("sheets").findOne({"sheetName": sheet}))._id;
                            let columns = await connection.db("nextERP").collection("headers").find({sheetId, name: {$regex: `^${col}`}}).toArray();

                            let response = [];
                            columns.forEach((col)=>{
                                response.push(`!${sheet}#${row}@${col.name}`);
                            })
                            res.send(response);
                        }catch(e){  
                            res.status(500).send({"err":"Sheet does not exist!"});
                        }
                    }else{
                        res.status(500).send({"err":"Input not valid!"});
                    }
                }else{
                    res.status(500).send(ERRORS.MONGO_DB_CONNECTION);
                }
            }else{
                res.status(500).send({
                    err: "Input is not correct!"
                })
            }
        }else{
            res.status(500).send({
                err: "Input is not correct!"
            })
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/hyperlink_cell_coords", async (req, res)=>{
    let {input, refCoords, text} = req.body;

    let ok = true;
    let refCoordsIds = [];

    if (refCoords !== undefined && refCoords.length != 0)
    {
        for (let cellCoord of refCoords)
        {
            let response = await excel_manager.validFullCoords(cellCoord);
            if (response?.success !== true)
            {
                ok = false;
                break;
            }else{
                refCoordsIds.push(response.data);
            }
        }
    }else{
        ok = false;
    }

    if (!ok)
    {
        res.sendStatus(500);
        return ;
    }

    if (text.trim() == "")
    {
        res.status(500).send({"body": "Please set the text to display!"});
        return;
    }

    let response = await excel_manager.validFullCoords(input);

    if (response?.success === true)
    {
        //we should set the column as the hyperlink 
        let update_response = await excel_manager.setHyperlink_cell_coords(refCoordsIds, text, input,[]);
        if (update_response?.success === true)
        {
            res.sendStatus(200);
        }else{
            res.status(500).send(update_response);
        }
    }else{
        res.status(500).send(response);
    }
})

router.post("/hyperlink_cell_conditions",async (req, res)=>{
    let {target_sheet, refCoords, conditionObject, text} = req.body;

    let ok = true;
    let refCoordsIds = [];

    if (refCoords !== undefined && refCoords.length != 0)
    {
        console.log(refCoords);
        for (let cellCoord of refCoords)
        {
            let response = await excel_manager.validFullCoords(cellCoord);
            if (response?.success !== true)
            {
                ok = false;
                break;
            }else{
                refCoordsIds.push(response.data);
            }
        }
    }

    if (!ok)
    {
        res.sendStatus(500);
        return ;
    }

    if (text.trim() == "")
    {
        res.status(500).send({"body": "Please set the text to display!"});
        return;
    }

    let input = undefined;
    if (input !== undefined && input != "")
    {
      
    }else if (conditionObject !== undefined && conditionObject.length != 0)
    {
        let response = [], ok = true;
        for (let coords of conditionObject)
        {
            console.log(coords);
            if (coords == null)
                ok = false;
            response.push({success: coords !== null})
        }

        if (ok){
        //now we should just insert first 
            let update_response = await excel_manager.setHyperlink_cell_conditions(refCoordsIds, text, conditionObject, target_sheet);
            
            res.sendStatus(200);
        }else
            res.send(response);
    }
    else{
        res.status(500).send({"err": "Input error!"})
    }
})

router.post("/run_hyperlink", async (req, res)=>{
    let {_id} = req.body;

    if (_id !== undefined)
    {
        let response = await excel_manager.hyperlink_details(_id);
        console.log(response);
        res.send(response);

    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/add_document", async (req, res)=>{
    let {color, name, page_id} = req.body;

    if (color !== undefined && name !== undefined && page_id !== undefined)
    {
        console.log(color);
        if (color.startsWith("#") && color.length == 7 && name.trim != "")
        {
            let response = await excel_manager.addDocument(name, color, page_id, req.user.userId);
            if (response?.success === true){
                res.send(response);
            }else{
                res.status(500).send(response);
            }
        }else{
            res.status(500).send({"body":"Invalid input data"});
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/remove_document", async (req, res)=>{
    let {doc_id} = req.body;

    if (doc_id !== undefined)
    {
        let response = await excel_manager.remove_document(doc_id, req.user.userId);
        if (response?.success === true){
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/rename_document", async (req, res)=>{
    let {doc_id, name} = req.body;

    if (doc_id !== undefined && name !== undefined && name.trim() != "")
    {
        let response = await excel_manager.rename_document(doc_id, req.user.userId, name);
        if (response?.success === true)
        {
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/import_excel", file_import.single("file"),async (req, res)=>{
    
    if (req.file)
    {
        let response = [];
        console.log(req.file);
        //read the file and process it 
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);

        workbook.eachSheet((worksheet)=>{
            let sheet_response = {};

            sheet_response.sheetName = worksheet.name;
            sheet_response.rows = worksheet.rowCount;
            sheet_response.data = [];

            for (let row = 1;row<=worksheet.rowCount;row++)
            {
                let aux = [];
                for (let cell = 1; cell<=worksheet.getRow(row).cellCount;cell++)
                {
                    aux.push(worksheet.getRow(row).getCell(cell).value);
                }
                sheet_response.data.push(aux);
            }
            response.push(sheet_response);
        })

        res.send(response);
    }else{
        res.status(500).send({
            body: "No file uploaded!"
        })
    }
})

router.post("/import_excel_final", file_import.single("file"), async(req, res)=>{
    let {data, sheetId, doc_id} = req.body;

    if (data !== undefined && sheetId !== undefined && doc_id !== undefined)
    {   
        try{
            data = JSON.parse(data);

            let response = await excel_manager.import_excel(data, sheetId, doc_id, req.user.userId, req.file.path);
            
            res.send(response);
        }catch(e){
            res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/remove_column",async (req, res)=>{
    let {uuid} = req.body;

    if (uuid !== undefined)
    {
        let response = await excel_manager.remove_column(uuid);

        if (response?.success === true)
        {
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/rename_column", async (req, res)=>{
    let {uuid, input} = req.body;

    if (uuid !== undefined && input !== undefined && input.trim() != "")
    {
        let response = await excel_manager.rename_column(uuid, input);

        if (response?.success === true)
        {
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/update_col_notes", async (req, res)=>{
    let {uuid, notes} = req.body;

    if (uuid !== undefined && notes !== undefined)
    {
        let response = await excel_manager.update_col_notes(uuid, notes);

        if (response?.success === true){
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/conditionalFormatting_add", async (req, res)=>{
    let {data, nodes} = req.body;

    if (nodes !== undefined && data !== undefined && nodes.length != 0 && data.length != 0)
    {   
        let response = await excel_manager.conditionalFormatting_add(nodes, data);

        res.send(response);
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/conditionalFormatting_remove", async (req, res)=>{
    let {uuid} = req.body;

    if (uuid !== undefined)
    {
        let response = await excel_manager.conditionalFormatting_remove(uuid);

        if (response?.success === true){
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/conditionalFormatting_wipe", async (req, res)=>{
    let {ids} = req.body;

    if (ids !== undefined){
        let response = await excel_manager.conditionalFormatting_wipe(ids);

        if (response?.success === true){
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/update_headerWidth", async (req, res)=>{
    let {uuid, width} = req.body;

    if (uuid !== undefined && width !== undefined){
        let response = await excel_manager.update_headerWidth(uuid, width);

        if (response?.success === true){
            res.sendStatus(200);
        }else{
            res.sendStatus(500);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

module.exports = router;

