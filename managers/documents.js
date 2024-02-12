const mongo = require("../managers/mongoDB");
const ERRORS = require("../errors");
const { ObjectId } = require("mongodb");

async function addPage(pageName, userId, icon = "fa-classic fa-gear")
{
    let connection = await mongo.getConnection();
    if (connection !== null)
    {
        try{    
            let page = await pageData(pageName, userId);

            if (page?.success === true)
            {
                return {"success": false, "body": "Page already exists!"};
            }

            let response = await connection.db("nextERP").collection("pages").insertOne({
                "pageName": pageName,
                "userId": userId,
                "icon": icon
            });
            if (response){
                return {success: true, "_id": response.insertedId};
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

async function page_checkID(pageId, userId)
{
    let connection = await mongo.getConnection();

    if (connection !== null)
    {   
        try{
            let response = await connection.db("nextERP").collection("pages").findOne({_id: new ObjectId(pageId), userId: userId});
            if (response){
                return {success: true, data: response};
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

async function pageData(pageName, user_id)
{
    let connection = await mongo.getConnection();
    if (connection !== null)
    {
        try{    
            let response = await connection.db("nextERP").collection("pages").findOne({
                "pageName": pageName,
                "userId": user_id
            });

            if (response){
                return {success: true, ...response};
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

async function docsForPage(page_id)
{
    let connection = await mongo.getConnection();

    if (connection !== null)
    {
        try{    
            let documents = connection.db("nextERP").collection("documents").find({pageId: new ObjectId(page_id)}).toArray();

            return {success: true, data: documents};
        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function getPagesAndDocuments(userId)
{
    let connection = await mongo.getConnection();

    if (connection !== null)
    {
        let result = await connection.db("nextERP").collection("pages").aggregate([
            {
                $match:{
                    userId: userId
                }
            },
            {
                $lookup:{
                    from: "documents",
                    localField: "_id",
                    foreignField: "pageId",
                    as: "page_documents"
                }
            },{
                $group: {
                    _id: "$_id",
                    pageName: { $first: "$pageName" },
                    icon: {$first: "$icon"},
                    documents: { $push: "$page_documents" }
                  }
            }, 
            {
                $sort: {
                  pageName: 1 
                }
              }
        ]).toArray();

        if (result)
        {
            return {success: true, result}
        }else{
            return {success: false};
        }

    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function page_params(page_name, doc_name, user_id)
{
    let connection = await mongo.getConnection();

    if (connection !== null)
    {
        try{    
            let page_response = await connection.db("nextERP").collection("pages").findOne({pageName: page_name, userId: user_id});
            if (page_response)
            {
                let doc_response = await connection.db("nextERP").collection("documents").findOne({userId: user_id, pageId: new ObjectId(page_response._id), name: doc_name});
                if (doc_response)
                {
                    return {success: true, data: {doc_id: doc_response._id, page_id: page_response._id}};
                }else{
                    return {success: false};
                }
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

async function add_document(color, name, page_id, user_id)
{
    let connection = await mongo.getConnection();

    if (connection !== null)
    {
        try{
            //check if page exists for this user 
            let page_response = await connection.db("nextERP").collection("pages").findOne({_id: new ObjectId(page_id), userId: user_id});

            if (page_response)
            {
                //now check for document existance in this page 
                let document_response = await connection.db("nextERP").collection("documents").findOne({pageId: new ObjectId(page_id), name: name});

                if (document_response)
                {
                    return {success: false, body: "A document with same name already exists!"};
                }else{
                    //free to insert ihere 
                    let result = await connection.db("nextERP").collection("documents").insertOne({
                        name: name, 
                        color: color, 
                        userId: user_id,
                        pageId: new ObjectId(page_id)
                    });

                    if (result){
                        return {success: true, data: {_id: result.insertedId, pageName: page_response.pageName}};
                    }else{
                        return ERRORS.MONGO_DB_QUERY;
                    }
                }
            }else{
                return {success: false, body: "The page does not exist!"};
            }

        }catch(e){
            return ERRORS.MONGO_DB_QUERY;
        }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

async function getDocsAndSheetByPage(page_id)
{
    let connection = await mongo.getConnection();

    if (connection !== null)
    {   
        let response = await connection.db("nextERP").collection("documents").aggregate([
            {
                $match:{
                    pageId: new ObjectId(page_id)
                }
            },
            {
              $lookup: {
                from: "sheets",
                localField: "_id",
                foreignField: "doc_id",
                as: "sheets"
              }
            },
            {
              $addFields: {
                sheets: "$sheets" // Rename the field to 'sheets'
              }
            }
          ]).toArray();

          if (response){
            return {success: true, data: response};
          }else{
            return {success: false}
          }
    }else{
        return ERRORS.MONGO_DB_CONNECTION;
    }
}

module.exports = {
    addPage, getPagesAndDocuments, page_params, add_document, pageData, docsForPage, page_checkID, getDocsAndSheetByPage
}