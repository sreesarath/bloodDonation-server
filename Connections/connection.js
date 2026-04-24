
const mongoose=require('mongoose')


const Connection_String=process.env.MONGO_URI

//connecting server with mongodb

mongoose.connect(Connection_String,{
    serverSelectionTimeoutMS:5000
}).then(()=>{

    console.log("Server Connected with Mongodb Server");
   
    
}).catch((err)=>{
    console.log(err);
    console.log("MongoDB Error:", err.message);
    
})