const express = require("express");
const app = express();
const path = require("path");
const mustache = require("mustache-express");
const cookieParser = require("cookie-parser");
const { checkLogin } = require("./middlewares");

(async ()=>{
    //let con = await mongo.getConnection();
   //con.db("nextERP").collection("cells").deleteMany({});
})();

app.use(cookieParser("nextERP"));
app.use(express.json());


// Router imports 
const excelRouter = require("./routers/excel");
const authRouter = require("./routers/auth");
const docRouter = require("./routers/documents");

app.use("/excel",excelRouter);
app.use("/auth",authRouter);
app.use("/document", docRouter);
// END ROUTING 

app.engine('html', mustache());
app.set('views', path.join(__dirname, '/pages'));

app.use(express.static(path.join(__dirname, 'pages')));
app.use("/assets",express.static(path.join(__dirname, "assets")));

app.get("/dashboard", checkLogin,(req, res)=>{
    res.render("dashboard.html",req.user);
})

app.get("/test",(req, res)=>{
    res.render("test.html");
})


app.listen(3000,()=>{
    console.log("App started on port 3000");
})