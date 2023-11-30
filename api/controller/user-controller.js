// importing external libraries
// bcrypt for hashing the password
// moment for creating timestamps
// logger for logging
const bcrypt = require("bcrypt")
const moment = require("moment")
const logger = require("../../logger")

const sequelize = require("../model/index")

// importing db models
const db = require("../model")
const User = db.users
const OTP = db.otps

// A health check method to check db connection status
const healthCheck = async (req, res) => {
    logger.info("hitting status check")

    sequelize.sequelize.authenticate().then(() => {
        res.send("Connection established successfully.")
    })
}

const createUser = async (req, res) => {
    // Extract user details from the request body
    const { idType, firstName, lastName, dateOfBirth, phoneNumber } = req.body

    if (!idType || !firstName || !lastName || !dateOfBirth || !phoneNumber) {
        return res.status(400).send("Bad request")
    }

    // Check if user already exists
    let user = await User.findOne({
        where: { phone: phoneNumber },
    })

    if (user != null) {
        logger.info(`GET: Success`)

        res.status(409).send("User already exists.")
    }

    var date = moment().tz("America/New_York").format("YYYY-MM-DDTHH:mm:ss.sss")

    // Create a new user
    let newUser = {
        first_name: firstName,
        last_name: lastName,
        dob: dateOfBirth,
        phone: phoneNumber,
        id_type: idType,
        account_created: date,
        account_updated: date,
    }

    await User.create(newUser)

    res.status(201).send("User created successfully.")
}

const sendSms = async (req, res) => {
    const accountSid = `${process.env.ACCOUNT_SID}`
    const authToken = `${process.env.AUTH_TOKEN}`
    const client = require("twilio")(accountSid, authToken)

    // Extract phone number from the request body
    const toPhoneNumber = req.body.phoneNumber

    if (!toPhoneNumber) {
        console.log(req.body)
        return res.status(400).send("Phone number is required.")
    }

    let user = await User.findOne({
        where: { phone: toPhoneNumber },
    })

    if (user == null) {
        logger.info(`GET: Success`)

        res.status(404).send("Not found")
    }

    // Generate a random 4-digit OTP
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString()

    client.messages
        .create({
            body: `Your OTP is: ${generatedOtp}`,
            from: `${process.env.FROM_PHONE_NUMBER}`,
            to: toPhoneNumber,
        })
        .then(async (message) => {
            console.log(`OTP sent successfully to ${toPhoneNumber}`)

            let otp = await OTP.findOne({
                where: { phone: toPhoneNumber },
            })

            if (otp == null) {
                logger.info(`GET: Success`)

                let newOTP = {
                    phone: toPhoneNumber,
                    otp: generatedOtp,
                }

                await OTP.create(newOTP)
            } else {
                await OTP.update(
                    {
                        otp: generatedOtp,
                    },
                    {
                        where: { phone: toPhoneNumber },
                    }
                )
            }

            res.send(`OTP sent successfully to ${toPhoneNumber}`)
        })
        .catch((error) => {
            console.log(error)
            res.status(500).send("Failed to send SMS.")
        })
}

const verifyOtp = async (req, res) => {
    const { phoneNumber, otp } = req.body

    if (!phoneNumber || !otp) {
        return res.status(400).send("Phone number and OTP are required.")
    }

    let otpRecord = await OTP.findOne({
        where: { phone: phoneNumber },
    })

    if (otpRecord == null) {
        res.status(404).send("Not found")
    }

    // Check if OTP matches and is not expired
    if (otpRecord.otp === otp) {
        // Send user id details

        const user = await User.findOne({
            where: { phone: phoneNumber },
        })

        res.status(200).send(user)
    } else {
        res.status(401).send("Invalid OTP.")
    }
}

const sendPushNotify = async (req, res) => {
    var FCM = require("fcm-node")
    var serverKey = `${process.env.SERVER_KEY}`

    var fcm = new FCM(serverKey)

    var message = {
        to: `${process.env.DEVICE_TOKEN}`,
        notification: {
            title: "TPA Mock Server",
            body: `${process.env.NOTIFICATION}`,
        },

        // data: {
        //     //you can send only notification or only data(or include both)
        //     title: "ok cdfsdsdfsd",
        //     body: '{"name" : "okg ooggle ogrlrl","product_id" : "123","final_price" : "0.00035"}',
        // },
    }

    fcm.send(message, function (err, response) {
        if (err) {
            console.log("Something has gone wrong!" + err)
            console.log("Response:! " + response)
        } else {
            console.log("Successfully sent with response: ", response)
        }
    })
}

module.exports = {
    healthCheck,
    createUser,
    sendSms,
    verifyOtp,
    sendPushNotify,
}
