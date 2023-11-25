const app = require("../api/app.js")
const request = require("supertest")
const chai = require("chai")
const expect = chai.expect

describe("Authentication Tests", () => {
    describe("Successes", () => {
        it("should check DB connection", (done) => {
            request(app)
                .get("/health")
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err)
                    done()
                })
        })
    })
})
