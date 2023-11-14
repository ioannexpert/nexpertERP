const express = require("express");
const router = express.Router();
const ERRORS = require("../errors");
const REGEX = require("../regex");
const mongo = require("../managers/mongoDB");

const mysql = require("../managers/mysql");

const { ObjectId } = require("mongodb");
const { v4: uuidv4 } = require('uuid');
const constants = require("../constants");

router.get("/get_sheets",async (req, res)=>{

        let connection = await mongo.getConnection();
        if (connection)
        {
            //query all thee sheets 
            try{
                let result = await connection.db("nextERP").collection("sheets").find({userId: 1}).toArray();
                res.send(result);
            }catch(e){
                res.status(500).send(ERRORS.MONGO_DB_QUERY);
            }
        }
        else{
            res.status(500).send(ERRORS.MONGO_DB_CONNECTION)
        }
})

router.post("/add_sheet",async (req, res)=>{
    const {sheetName} = req.body;

    if (sheetName.trim() != "")
    {
        //check for special chars 
        if (REGEX.allowedChars.test(sheetName))
        {
            //check if unique 
            let connection = await mongo.getConnection();   

            if (connection!==null)
            {
                let sheetNameUQ = await connection.db("nextERP").collection("sheets").findOne({sheetName});
                
                if (sheetNameUQ == null){
                    //ok, insert 
                    try{
                        let result = await connection.db("nextERP").collection("sheets").insertOne({
                            sheetName,
                            notes: "",
                            userId: 1
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

router.get("/get_all_headers", async (req, res)=>{
    let connection = await mongo.getConnection();
    if (connection)
    {
        try{
            let result = await connection.db("nextERP").collection("headers").aggregate([
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
                    name: 1
                  }
                }
              ]).toArray();
    
              res.send(result);
        }catch(e){
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
                        value: data[cellCoords].value,
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
        let connection = await mongo.getConnection();

        if (connection)
        {
            try{
                await connection.db("nextERP").collection("sheets").deleteMany({_id: new ObjectId(sheetId)});
                await connection.db("nextERP").collection("cells").deleteMany({sheetId: new ObjectId(sheetId)});
                await connection.db("nextERP").collection("headers").deleteMany({sheetId: new ObjectId(sheetId)});
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

module.exports = router;
