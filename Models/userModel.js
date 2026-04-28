const mongoose=require('mongoose')

const userSchema= new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    }
    ,phone:{
        type:String,
        required:true
    },
        secondaryPhone:{
        type:String
    },
 
    bio:{
        type:String,
        default:"I am BloodFinder user!!"
    },
    profile:{
        type:String,
        default:""
    },
    role:{
        type:String,
        default:"User"
    }
})
const users=mongoose.model('user',userSchema)
module.exports=users