const url = "mongodb://0.0.0.0:27017";
const dotenv = require("dotenv").config("process.env");
const {MongoClient} = require("mongodb");

const client = new MongoClient(url,{
    serverSelectionTimeoutMS: dotenv.parsed.MONGO_TIMEOUT
});

var connection = null;

async function getConnection()
{
    if (connection)
    {
        console.log("reused");
        return connection;
    }    
    else{
        try{
            connection = await client.connect();
            return connection
        }
        catch(e){
            return null;
        }
    }
}

function done(connection)
{
    try{
        connection.close();
    }catch(e){

    }
}

module.exports = {
    getConnection
}