var express = require('express');
var router = express.Router();
let mysql = require("../../db/connect");
const { ValidateEmail, ValidatePassword, ValidateUsername, isExist} = require('./join');
const bcrypt = require('bcrypt');
const { makeToken } = require("../../modules/tokenGen");

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
let goodResponse = {status: "ok", body: {errors: [], user: {}}}
let badResponse = {status: "fail", body: {errors: [{message: ""}]}}
let badEmailResponse = {status: "fail", body: { errors: [{message: "Invaild Email address"}]}}
let badNameResponse = {status: "fail", body: {errors: [{message: "Enter a name under 30 characters"}]}}
let badBioResponse = {status: "fail", body: {errors: [{message: "Enter a bio under 200 characters"}]}}
let badUsernameResponse = {status: "fail", body: { errors: [{message: "Invaild Username"}]}}
let badPasswordResponse = {status: "fail", body: { errors: [{message: "Invaild Passowrd"}]}}
let badVerifyPasswordResponse = {status: "fail", body: { errors: [{message: "The verify passowrd doesn't match the new password"}]}}
let badOldPasswordResponse = {status: "fail", body: { errors: [{message: "The old password doesn't match"}]}}

let usedEmailResponse = {status: "fail", body: { errors: [{message: "This email is already exist"}]}}
let usedUsernameResponse = {status: "fail", body: { errors: [{message: "This username is already exist"}]}}

router.put("/", async (req, res) => {
  let settings = req.body,
  token = req.headers["x-accesstoken"];
  // console.log(settings);

  delete settings['token'];
  delete settings['UID'];
  delete settings['last_login'];
  delete settings['created_at'];
  delete settings['ip'];
  // delete settings[''];

  // let db = mysql.makeConnection();
  let user = await mysql.getUserByToken(token);
  user=user[0];
  for(let [key, value] of Object.entries(settings)) {

    if(value.length < 1) {
      delete settings[key]
      continue;
    }
    // else if(value.toLowerCase() == user[key].toLowerCase()) {
    //   delete settings[key]
    //   continue;
    // }
    else if(key == "username") {
      if(value.toLowerCase() == user.username.toLowerCase()) {
        delete settings[key]
        continue;
      } else {

        if(!ValidateUsername(value)) return res.status(406).json(badUsernameResponse);
        if(await isExist(value, 'username')) return res.status(406).json(usedUsernameResponse);
      }

    } else if(key == "password") {
      if(!settings["old_password"]) return res.status(406).json(badOldPasswordResponse);
      if(!settings['verify_password'] || settings['verify_password'] != settings['password']) return res.status(406).json(badVerifyPasswordResponse);
      if(!ValidatePassword(value)) return res.status(406).json(badPasswordResponse);
      settings.password = await mysql.hash(settings.password);
      settings.token = makeToken();
    } else if(key == "email") {
      if(value.toLowerCase() == user.email.toLowerCase()) {
        delete settings[key]
        continue;
      } else {
      if(!ValidateEmail(value)) return res.status(406).json(badEmailResponse);
      if(await isExist(value, 'email')) return res.status(406).json(usedEmailResponse);
    }
    } else if(key == "old_password") {
      if(!await mysql.compare(settings["old_password"], user.password)) return res.status(406).json(badOldPasswordResponse);
    } else if(key == "name") {
      if(settings["name"].length > 30) res.status(406).json(badNameResponse);
    } else if(key == "bio") {
      if(settings["bio"].length > 200) res.status(406).json(badBioResponse);
    }
  }
  delete settings['verify_password']
  delete settings["old_password"]
  mysql.updateUser(settings, token)
  .then(user => {
    goodResponse.body.user = user
    res.json(goodResponse);
  })
  .catch(err => {
    badResponse.body.errors[0].message = err
    res.status(400).json(badResponse);
  })

});

module.exports = router;
