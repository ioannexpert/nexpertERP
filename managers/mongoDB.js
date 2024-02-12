const url = "mongodb://0.0.0.0:27017";
const dotenv = require("dotenv").config("process.env");
const {MongoClient, ObjectId} = require("mongodb");

const client = new MongoClient(url,{
    serverSelectionTimeoutMS: dotenv.parsed.MONGO_TIMEOUT
});

var connection = null;

async function getConnection()
{
    if (connection)
    {
        return connection;
    }    
    else{
        try{
            connection = await client.connect();
            return connection
        }
        catch(e){
            console.log(e);
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

function array_to_objectIds(array){
    let aux = [];
    array.forEach((elem)=>{
        if (elem !== null && elem !== undefined)
        aux.push(new ObjectId(elem));
    })

    return aux;
}

module.exports = {
    getConnection, array_to_objectIds
}