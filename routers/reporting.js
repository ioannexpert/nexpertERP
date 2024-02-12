const express = require("express");
const router = express.Router();
const ERRORS = require("../errors");
const { checkLogin } = require("../middlewares");
const reporting_manager = require("../managers/reporting");
const document_manager = require("../managers/documents");
const { report } = require("./excel");


router.use(checkLogin);

router.get("/", async (req, res)=>{
    let menu = await document_manager.getPagesAndDocuments(req.user.userId);
    let docsForPage = [];

    if (menu?.success === true){
        res.render("reporting.html",{pages: menu.result, ...req.user});
    }else{
        res.sendStatus(404);
    }
})

router.post("/save_diagram", async (req, res)=>{
    let {name, json, image, sheets_included} = req.body;

    if (name !== undefined && json !== undefined && image !== undefined && sheets_included !== undefined){
        
        let response = await reporting_manager.save_diagram(name, json, req.user.userId, image, sheets_included);
        res.send(response);
    
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.get("/get_diagrams", async (req, res)=>{

    let diagram_response = await reporting_manager.get_diagrams(req.user.userId);
    if (diagram_response?.success === true){
        let user_ids = [];
        
        diagram_response.data.forEach((diagram)=>{
            user_ids.push(diagram.user_id);
        })

        let users = await reporting_manager.get_user_name(user_ids);

        res.send({diagram_response, users});

    }else{
        res.sendStatus(500);
    }
})

router.post("/get_sheet_names", async (req, res)=>{
    let {sheet_ids} = req.body;

    if (sheet_ids !== undefined){   
        let response = await reporting_manager.get_sheet_names(sheet_ids);
        res.send(response);
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/generate_graph_type_one", async (req, res)=>{
    let {sheet_id, column_uuid} = req.body;

    if (sheet_id !== undefined && column_uuid !== undefined){
        //get the data and send as array
        let response = await reporting_manager.get_data_array(sheet_id, column_uuid);
        res.send(response);
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/smart_relations", async (req, res)=>{
    let {previous, current} = req.body;

    if (previous !== undefined && current !== undefined && previous instanceof Array && previous.length != 0){
        
        res.send(await reporting_manager.smart_relations(previous, current));

    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/relation_type", async (req, res)=>{
    let {column1, column2} = req.body;

    if (column1 !== undefined && column2 !== undefined){
        let response = await reporting_manager.get_relation_type(column1, column2);

        res.send(response);
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/get_headers", async (req, res)=>{
    let {sheet_id} = req.body;

    if (sheet_id !== undefined){
        let response = await reporting_manager.get_headers(sheet_id);
        res.send(response);
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/get_values", async (req, res)=>{
    let {sheet_id, page} = req.body;

    if (sheet_id !== undefined && page !== undefined && parseInt(page) != NaN)
    {   
        res.send(await reporting_manager.get_values(sheet_id, page));
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

router.post("/relational_data", async (req, res)=>{
    let {sheets, selected, relations} = req.body;

    if (sheets !== undefined && selected !== undefined && relations !== undefined){
        reporting_manager.get_relational_data(sheets, selected, relations);
        res.send(req.body);
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

module.exports = router;