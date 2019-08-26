"use strict"

const express = require("express")
const fs = require("fs")
const bodyParser = require("body-parser")
const textLogger = require("./utils").textLogger
const { createRouter } = require("./routes/lambda")
const app = express()



app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.set("view engine", "ejs")

app.use(express.static("public"))

app.get("/", (req, res) => {
  res.redirect("/lambda")
})

app.use("/lambda", createRouter("lambda"))

app.get("/log", (req, res) => {
  fs.readFile("log/log.tmp", (err, data) => {
    // no way to log error
    res.render(`log`, { "log": data })
  })
})

app.delete("/log", (req, res) => {
  fs.writeFile("log/log.tmp", "", (err, data) => {
    if (err) {
      console.log("encounter error", err)
      res.status(500).send("error")
    } else
      res.send("complete")
  })
})


app.get("/healthcheck", (req, res) => {
  res.status(200).json({
    "message":"Im healthy!"
  })
})

app.get("/*", (req, res) => {
  textLogger(req.path)("route not found")
  res.status(404).json({
    "message": "not found."
  })
})

let port = 3000
app.listen(port, () => console.log(`App is listening on port ${port}!`))