// importing external libraries
// bcrypt for hashing the password
// moment for creating timestamps
// logger for logging
const bcrypt = require("bcrypt")
const moment = require("moment")
const logger = require("../../logger")
const { exec } = require("child_process")

const ethers = require("ethers")
const addresses = require("../../constants/contractAddresses.json")
const contractABI = require("../../constants/abi.json")

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
    const address = req.body.address

    if (!toPhoneNumber || !address) {
        console.log(req.body)
        return res.status(400).send("Phone number and address are required.")
    }

    let user = await User.findOne({
        where: { phone: toPhoneNumber },
    })

    if (user == null) {
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
                let newOTP = {
                    phone: toPhoneNumber,
                    otp: generatedOtp,
                    address: address,
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

            res.status(200).send(`OTP sent successfully to ${toPhoneNumber}`)
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

    let otpRecord = await OTP.findOne({ where: { phone: phoneNumber } })

    if (!otpRecord) {
        return res.status(404).send("OTP record not found.")
    }

    if (otpRecord.otp === otp) {
        console.log("OTP verified")

        let user = await User.findOne({ where: { phone: phoneNumber } })

        if (!user) {
            return res.status(404).send("User not found")
        }

        console.log(`Running hardhat command for ${otpRecord.address}`)

        const command = `cd ../smart-contracts/ && npx hardhat custom-mint --signer ${otpRecord.address} --firstname ${user.first_name} --lastname ${user.last_name} --dob ${user.dob} --phone ${user.phone} --network sepolia`

        exec(command, async (error, stdout) => {
            if (error) {
                console.error(`Exec error: ${error}`)
                return res.status(500).send("Error executing hardhat command")
            }

            console.log(stdout)

            console.log("Command executed, fetching ID data from blockchain")

            const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
            const contractAddress = addresses["11155111"][0]

            if (!contractAddress) {
                return res.status(500).send("Contract address not found.")
            }

            const contract = new ethers.Contract(contractAddress, contractABI, provider)

            try {
                const idData = await contract.getID(otpRecord.address)

                // convert dob to timestamp
                const dobTimestamp = Date.parse(user.dob)

                const responseObj = {
                    address: otpRecord.address,
                    idType: user.id_type,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    dateOfBirth: dobTimestamp,
                    phone: user.phone,
                    UID: idData.UID,
                }

                res.status(200).json(responseObj)
            } catch (contractError) {
                console.error(`Contract call error: ${contractError}`)
                res.status(500).send("Error retrieving ID data from contract.")
            }
        })
    } else {
        res.status(401).send("Invalid OTP.")
    }
}

module.exports = {
    healthCheck,
    createUser,
    sendSms,
    verifyOtp,
}
