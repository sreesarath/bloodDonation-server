const expres=require('express')

const router=expres.Router()
const {registerUser,loginUser}=require('../Controller/userController')
const protect = require('../Middleware/AuthMiddleware')
const upload = require('../Middleware/multer')
const { registerDonor, getAllDonors, getMyProfile, updateProfile, uploadProfileImage, deleteAccount, toggleAvailability, getDonorById } = require('../Controller/donorController')
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
router.put('/complete-donation/:id',protect,requestController.completeDonation)
router.put('/rate-donor/:id',protect,requestController.rateDonors)

//profile
router.get('/getmyprofile',protect,getMyProfile)
router.put('/updateprofile',protect,updateProfile)
router.post('/uploadImg',protect,upload.single('profile'),uploadProfileImage)
router.delete('/delete-account',protect,deleteAccount)
router.patch('/toggle',protect,toggleAvailability)

router.get('/donorProfile/:id',protect,getDonorById)



module.exports=router