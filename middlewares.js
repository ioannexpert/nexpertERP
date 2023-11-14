const jwt = require("jsonwebtoken");

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


module.exports = {
    checkLogin
}