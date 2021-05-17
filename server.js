const express = require('express');
const consola = require("consola");
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const app = express();

let liste = ["/accounts/login", "/accounts/join", "/users/"]

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(helmet()); // Seurity plugin
app.use(cors()); // CORS
// app.use(
//   rateLimit({
//     windowMs: 60 * 1000,
//     max: 10,
//     message: {status: "fail", body: { errors: [{message: "Please wait few minutes before trying again"}]}}
//   })
// );

const mysql = require("./db/connect.js");

const port = 8081;


app.use(bodyParser.urlencoded({ extended: true }));
app.use(function timeLog (req, res, next) {
  app.getDate = () => { return new Date() }
  next();
});


app.use(function iper(req, res, next) {
	let ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	app.getIP = () => { return ip }
	next()
})

app.use((req, res, next)=> {
    res.header("Access-Control-Allow-Origin", "https://toolslib.co");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Content-Type", "application/json");
    consola.info(`\x1b[1m\x1b[30m`+``.padStart(64, "―")+`\x1b[0m`);
    if(req.method == "POST") {
    	consola.info(`[${mysql.getDate()}] [\x1b[1m\x1b[36m${req.method}\x1b[0m] - [\x1b[1m\x1b[37m${app.getIP()}\x1b[0m]   =>  [\x1b[1m\x1b[33m${req.baseUrl + req.path}\x1b[0m]`);
    }
    else if(req.method == "GET") {
    	consola.info(`[${mysql.getDate()}] [\x1b[36m${req.method}\x1b[0m]  - [\x1b[1m\x1b[37m${app.getIP()}\x1b[0m]   =>  [\x1b[1m\x1b[33m${req.baseUrl + req.path}\x1b[0m]`);
    }
    else {
    	consola.info(`[${mysql.getDate()}] [\x1b[36m${req.method}\x1b[0m]  - [\x1b[1m\x1b[37m${app.getIP()}\x1b[0m]   =>  [\x1b[1m\x1b[33m${req.baseUrl + req.path}\x1b[0m]`);
    }
    let fullPath = req.baseUrl + req.path;
    let headers = req.headers;
    let regs = new RegExp("[0-9]*")
    if(fullPath == "/") {
      res.redirect("https://toolslib.co");
    } else if(fullPath.includes("/login") || fullPath.includes("/join") || fullPath == "/seed" || fullPath.match(/[0-9]+$/g)) {
      next()
    } else if(headers["x-accesstoken"]) {

      mysql.getUserByToken(headers["x-accesstoken"], ["token"])
      .then(rows => {
        next();
      })
      .catch(err => {
        res.status(403).json({status: "failed",body: { errors: [{message: "Invaild access token"}]}})
      })

    } else {
      res.status(401).json({status: "failed", body: { errors: [{message: "Missing access token"}]}})
    }
});

app.use("/", require("./routes"));

app.listen(port, async () => {
  console.log(`API is listening at ${port}`);
  // let {username, password, token, ip, email} = settings;
  console.log(await mysql.hash(""));


});
