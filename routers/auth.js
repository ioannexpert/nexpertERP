const express = require("express");
const router = express.Router();
const ERRORS = require("../errors");
const userManager = require("../managers/users");
const jwt = require("jsonwebtoken");

router.get("/",(req, res)=>{
    res.redirect("/auth/login");
})

router.get("/login",(req, res)=>{
    res.render("index.html");
})

router.post("/login",(req, res)=>{
    const {user, pass} = req.body;

    if (user !== undefined && pass !== undefined)
    {
        //check in db 
        userManager.login_user(user, pass).then((response)=>{
            
            //sign the jwt  
            let token = jwt.sign({
                userId: response.id,
                userName: response.user,
                userRole: response.role,
                userFullName: response.name
            },"nextERP");
            res.cookie("auth",token, {secure: true, httpOnly: true, }) 

            res.sendStatus(200);
        }).catch((err)=>{
            console.log(err);
            res.status(500).send(err);
        })
    }else{
        res.status(500).send(ERRORS.INCOMPLETE_REQUEST);
    }
})

module.exports = router;