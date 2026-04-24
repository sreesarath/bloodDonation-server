const mongoose =require('mongoose')

const donorSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:true
    },
    bloodgroup:{
        type:String,
        required:true
    },
    weight:{
        type:Number,
        required:true
    },
    gender:{
     type:String,
     enum:["Male","Female","Other"],
     required:true
    },
    phone:{
        type:String,
        required:true
    },
    lastDonated:{
        type: Date
    },
    location:{
        type:{
            type:String,
            enum:["Point"],
            default:"Point"

        },
        coordinates:
      {  type:[Number],
        required:true }// logitude and latitude
    },
    isEligible:{
        type:Boolean,
        default:true
    }
},{timestamps:true})
donorSchema.index({ location: "2dsphere" })
module.exports=mongoose.model('donor',donorSchema)