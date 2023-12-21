const express = require("express");
const router = express.Router();
const ERRORS = require("../errors");
const excel_manager = require("../managers/excel");
const document_manager = require("../managers/documents");
const { checkLogin, getDocuments } = require("../middlewares");

router.use(checkLogin);
router.use(getDocuments);

router.get("/:page_name/:doc_name", async (req, res)=>{
    let {page_name, doc_name} = req.params;
    let user_id = req.user.userId;
    if (page_name !== undefined && doc_name !== undefined)
    {
        let response = await document_manager.page_params(page_name, doc_name, user_id);
        if (response?.success === true)
        {
            let menu = await document_manager.getPagesAndDocuments(req.user.userId);
        
            if (menu?.success === true){
                res.render("excel.html",{pages: menu.result, ...req.user, doc_id: response.data.doc_id, pageName: page_name});
            }else{
                res.sendStatus(404);
            }
        }else{
            res.sendStatus(404);
        }
    }else{
        res.sendStatus(404);
    }
})

router.get("/:page_name", async (req, res)=>{
    let {page_name} = req.params;

    if (page_name !== undefined)
    {
        let response = await document_manager.pageData(page_name, req.user.userId);

        if (response?.success === true)
        {
            
            let menu = await document_manager.getPagesAndDocuments(req.user.userId);
            let docsForPage = [];

            if (menu?.success === true){
                res.render("page.html",{pages: menu.result, ...req.user, pageId: response._id});
            }else{
                res.sendStatus(404);
            }

        }else{
            res.sendStatus(404);
        }
    }else{
        res.sendStatus(404);
    }
})

router.post("/get_documents",async (req, res)=>{
    let {page_id} = req.body;

    if (page_id !== undefined)
    {
        let myPage = await document_manager.page_checkID(page_id, req.user.userId);
        if (myPage?.success === true)
        {   
            let data = await document_manager.getDocsAndSheetByPage(page_id);

            res.send({...data, pageName: myPage.data.pageName});
        }else{
            res.status(500);
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
})

router.post("/add_page", async (req, res)=>{
    let user = req.user;
    let {pageName, icon} = req.body;

    if (pageName !== undefined)
    {
        let response = await document_manager.addPage(pageName, user.userId, icon);

        if (response?.success === true){
            res.send(response);
        }else{
            res.status(500).send(response);
        }
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }

})

router.post("/add_document",async (req, res)=>{
    let {color, name, page_id} = req.body;
    
    if (color !== undefined && name !== undefined && page_id !== undefined)
    {
        if (color.startsWith("#") && color.length == 7 && name.trim != "")
        {
            let response = await document_manager.add_document(color, name, page_id, req.user.userId);
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
module.exports = router;