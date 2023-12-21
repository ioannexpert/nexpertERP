const mysql = require("../managers/mysql");
const ERRORS = require("../errors");
const bcrypt = require("bcrypt");

function testUserPass(pass="test")
{
    bcrypt.hash(pass, 10).then((hash)=>{
        console.log(hash);
    })
}


async function login_user(user, pass){

   return new Promise(async (resolve, reject)=>{
    let connection = await mysql.getConnectionWrapper();

    if  (connection){

        connection.query("SELECT id, hash, name, role from users where user = ?",[user],(err, results, fields)=>{
            mysql.release(connection);
            if (err){
                reject(ERRORS.MYSQL_DB_QUERY);
            }else{
                //check the passwords now 
                if (results.length != 0)
                {
                    const {id, hash, name, role} = results[0];

                        bcrypt.compare(pass, hash).then((err)=>{
                            //ok
                            if (!err){
                                resolve({
                                    id,
                                    user,
                                    name, 
                                    role
                                })
                            }else{
                                reject(ERRORS.AUTH_WRONG_PASS);
                            }
                        }).catch((e)=>{
                            console.log(e);
                            reject(ERRORS.AUTH_WRONG_PASS);
                        })
                    
                }else{
                    reject(ERRORS.AUTH_NO_USER_FOUND);
                }
            }
        })
    }else{
        reject(ERRORS.MYSQL_DB_CONNECTION);
    }
   })
}



module.exports = {
    login_user
}