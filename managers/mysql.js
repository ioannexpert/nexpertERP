const mysql = require("mysql");

//init the pool
var pool = mysql.createPool({
    user: "root",
    password: "",
    port: 3306,
    database: "nextERP"    
});

async function getConnection()
{
     return new Promise((ressolve, reject)=>{
        pool.getConnection((err, conn)=>{
            if (err){
                return reject(err);
            }
            ressolve(conn);
        })
     })
}

async function getConnectionWrapper()
{
    try{
    let connection = await getConnection();
    return connection;
    }
    catch(e){
        return null;
    }
}

function release(connection){
    connection.release();
}

module.exports = {
    getConnectionWrapper, mysql, release
}