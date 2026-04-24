const expres=require('express')

const router=expres.Router()
const {registerUser,loginUser}=require('../Controller/userController')
const protect = require('../Middleware/AuthMiddleware')
const upload = require('../Middleware/multer')
const { registerDonor, getAllDonors } = require('../Controller/donorController')
const requestController=require('../Controller/requestController')


//user authentication
router.post('/register',registerUser)
router.post('/login',loginUser)

// donor register

router.post('/donor-register',protect,upload.single('idProof'),registerDonor)
router.get('/all-donors',protect,getAllDonors)

// request route
router.post('/request',protect,requestController.createRequest)

router.get('/nearby',protect,requestController.getNearbyDonors)
router.get('/my-request',protect,requestController.getMyrequests)
router.get('/nearby-request',protect,requestController.getNearbyRequests)
router.delete('/delete-request/:id',protect,requestController.deleteRequest)
router.put('/accept-request/:id',protect,requestController.acceptRequest)
router.put('/reject-request/:id',protect,requestController.rejectRequest)



module.exports=router