const multer=require('multer')
const fs=require('fs')
const path=require('path')



const uploadpath=path.join(__dirname,'../uploads')

// create the upload folder

if (!fs.existsSync(uploadpath)) {
    fs.mkdirSync(uploadpath)
}
const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
     cb(null,uploadpath)
    },
    filename:(req,file,cb)=>{
        cb(null,Date.now() + "-" + file.originalname)
    }
})
const upload=multer({storage})
module.exports=upload