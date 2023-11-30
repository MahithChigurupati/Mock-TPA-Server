// defining routes to route request calls to corresponding methods

const userController = require("../controller/user-controller.js")

const router = require("express").Router()

//Route for GET method -- a health check method
router.get("/health", userController.healthCheck)

router.post("/createUser", userController.createUser)

router.post("/sendSMS", userController.sendSms)

router.post("/verifyOTP", userController.verifyOtp)

module.exports = router
