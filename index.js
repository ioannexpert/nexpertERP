const express = require("express");
const app = express();
const path = require("path");
const mustache = require("mustache-express");

app.use(express.json());
// Router imports 
const excelRouter = require("./routers/excel");

app.use("/excel",excelRouter);

// END ROUTING 

app.engine('html', mustache());
app.set('views', path.join(__dirname, '/pages'));

app.use(express.static(path.join(__dirname, 'pages')));
app.use("/assets",express.static(path.join(__dirname, "assets")));


app.get("/",(req, res)=>{
    res.render("index.html");
})

app.get("/dashboard",(req, res)=>{
    res.render("dashboard.html");
})

app.get("/test",(req, res)=>{
    res.render("test.html");
})

app.listen(3000,()=>{
    console.log("App started on port 3000");
})