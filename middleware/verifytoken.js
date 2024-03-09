const jwt = require("jsonwebtoken");
require('dotenv').config();
const SECRETKEY = process.env.SECRET_KEY;

const verifytoken=(req,res,next)=>{

    const token_in_headers = req.headers.jwttoken;
    
     console.log("JWT TOKEN IN GOT IN MIDDLEWARE :"+token_in_headers);

    if(!token_in_headers){
        console.log("NO TOKEN IN HEADERS")
        console.log(req.body)
        return  res.status(400).json({msg:"SOME PROBLEM WITH JWTTOKEN IN HEADERS(in middleware verifytoken.js)"})
    }

    jwt.verify(token_in_headers,SECRETKEY,(err,user)=>{
        if(err) {
            console.log(err)
           return  res.status(400).json({err,msg:"ERROR IN verifytoken.js"});
        }
       
        // doubt??
        req.user = user;

        next();

    })
}

module.exports={verifytoken};