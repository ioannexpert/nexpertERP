const express = require("express");
const app = express();
const path = require("path");

app.use(express.static(path.join(__dirname, "pages")));
app.use("/assets",express.static(path.join(__dirname, "assets")));


app.get("/",(req, res)=>{
    res.render("/index.html");
})

app.listen(3000,()=>{
    console.log("App started on port 3000");
})