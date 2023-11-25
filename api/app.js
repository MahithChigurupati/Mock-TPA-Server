//importing and initializing express app
const express = require("express")

//importing routes
const userRouter = require("./routes/users-router.js")

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

//initializing app to use routes
app.use("/", userRouter)

//for all other invalid routes
app.use("*", (req, res) => {
    res.status(400).send("Invalid route")
})

module.exports = app
