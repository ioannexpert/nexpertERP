const jwt = require("jsonwebtoken");
const { getDocumentsForUser } = require("./managers/excel");

function checkLogin(req, res, next)
{
    //get auth cookie 
    let {auth} = req.cookies;

    if (auth !== undefined)
    {
        jwt.verify(auth,"nextERP",(err, payload)=>{
            if (err)
            {
                //invalidate cookie 
                res.clearCookie("auth");
                return res.redirect("/auth/login");
            }else{
                req.user = payload;
                next();
            }
        })
    }else{
        return res.redirect("/auth/login");
    }
}

async function getDocuments(req, res, next)
{
    if (req.user)
    {
        let docs = await getDocumentsForUser(req.user.userId);
        if (docs?.success === true)
        {
            req.documents = docs.data;
            next();
        }else{
            return res.sendStatus(500);
        }
    }else{
        return res.sendStatus(404);
    }
}


module.exports = {
    checkLogin, getDocuments
}