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

// A health check method to check db connection status
const healthCheck = async (req, res) => {
    logger.info("hitting status check")

    sequelize.sequelize.authenticate().then(() => {
        res.send("Connection established successfully.")
    })
}

const sendSms = async (req, res) => {
    const accountSid = `${process.env.ACCOUNT_SID}`
    const authToken = `${process.env.AUTH_TOKEN}`
    const client = require("twilio")(accountSid, authToken)

    client.messages
        .create({
            body: `${process.env.MESSAGE}`,
            from: `${process.env.FROM_PHONE_NUMBER}`,
            to: `${process.env.TO_PHONE_NUMBER}`,
        })
        .then((message) => console.log(`Message ${message.sid} sent successfully`))
        .catch((error) => {
            console.log(error)
        })
}

module.exports = {
    healthCheck,
    sendSms,
}
