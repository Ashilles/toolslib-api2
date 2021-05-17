const mysql = require('mysql');
const {host, user, password, database, table, charset} = require('../config/config.json');
const consola = require('consola');
const bcrypt = require('bcrypt');



let date = () => {
  let month = parseInt(new Date().getMonth())+1;
  month = (month < 10) ? "0"+month : month

  let day = parseInt(new Date().getDate());
  day = (day < 10) ? "0"+day : day


  let hour = parseInt(new Date().getHours());
  hour = (hour < 10) ? "0"+hour : hour
  hour = (hour == "00") ? "12" : hour

  let minutes = parseInt(new Date().getMinutes());
  minutes = (minutes < 10) ? "0"+minutes : minutes

  let seconds = parseInt(new Date().getSeconds());
  seconds = (seconds < 10) ? "0"+seconds : seconds

  return hour + ":" + minutes + ":" + seconds + " " + month + "/" + day + "/" + new Date().getFullYear()
}
const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
let makeConnection = () => {

    let con = mysql.createConnection({
    host,
    user,
    password,
    database,
    charset
  });
  con.on("connect", () => {
    // console.log(con);
    consola.info('['+ date() +']'+ ' [\x1b[1m\x1b[30mDB\x1b[0m]   - [\x1b[1m\x1b[32mCONNECT\x1b[0m]        ->  [ID: \x1b[1m\x1b[30m' + con.threadId + "\x1b[0m]");
  })
  con.on("end", () => {
    consola.info('['+ date() +']'+ ' [\x1b[1m\x1b[30mDB\x1b[0m]   - [\x1b[1m\x1b[31mDISCONNECT\x1b[0m]     ->  [ID: \x1b[1m\x1b[30m' + con.threadId + "\x1b[0m]");
  })
   return con;
}

module.exports.hash = (password) => {
  return new Promise(function(resolve, reject) {
    bcrypt.hash(password, 10, (err, hash) => {
      if(err) return reject(err);
      return resolve(hash);
    });
  });
}

module.exports.compare = (password, hashed) => {
  return new Promise(function(resolve, reject) {
    bcrypt.compare(password, hashed, (err, hash) => {
      if(err) return reject(err);
      return resolve(hash);
    });
  });
}

module.exports.makeConnection = makeConnection;
module.exports.getDate = date;

module.exports.getAllUsers = (keys=["*"]) => {
  let db = makeConnection();
  return new Promise((resolve, reject) => {
    db.query(`SELECT ${keys.join(", ")} from users`, (err, rows) => {
      if(err) return reject(err);
      if(!rows || !rows[0] || rows.length < 1) {
        db.end();
        return reject(false);
      } else {
        db.end();
        return resolve(rows);
      }
    });
  });
}

module.exports.getUserBy = (obj, keys=["*"]) => {
  return new Promise(function(resolve, reject) {
    let where = "", objArray = Object.entries(obj), items=[];
    let i =0;
    for(let [key, value] of objArray) {
      // console.log();
      where+=`${key}=?`;
      items.push(value);
      if (objArray[i] != objArray[objArray.length-1]) {
        where+=" AND ";
      }
      i++;
    }
    let db = makeConnection();
    db.query(`SELECT ${keys.join(", ")} FROM users WHERE ${where}`, items, (err, rows) => {
      if(err) return reject(err);
      if(!rows || !rows[0] || rows.length < 1) {
        db.end();
        return reject(rows);
      } else {
        db.end();
        return resolve(rows);
      }
    });
  });
}

module.exports.getUserByUID = (UID, keys=["*"]) => {
  if(!UID || isNaN(UID)) {
    throw new Error("UserID must be Integer");
    return false;
  }
  return new Promise((resolve, reject) => {
    module.exports.getUserBy({UID}, keys).then((dat) => {
      return resolve(dat);
    }).catch((dat) => {
      return reject(dat);
    });
  });
}

module.exports.getUserByUsername = (username, keys=["*"]) => {
  return new Promise((resolve, reject) => {
    module.exports.getUserBy({username}, keys).then((dat) => {
      return resolve(dat);
    }).catch((dat) => {
      return reject(dat);
    });
  });
}

module.exports.getUserByToken = (token, keys=["*"]) => {
  return new Promise((resolve, reject) => {
    module.exports.getUserBy({token}, keys).then((dat) => {
      return resolve(dat);
    }).catch((dat) => {
      return reject(dat);
    });
  });
}

const checkUserColumn = (col) => {
  let db = makeConnection();
  return new Promise((resolve, reject) => {
    db.query("SHOW COLUMNS FROM `users` LIKE ?", [col], (err, exist) => {
      if(err) return reject(err);
      if(!exist || !exist[0] || exist.length < 1) {
        db.end();
        resolve(false);
        return
      }
      db.end();
      return resolve(true);
    });
  });
}

module.exports.updateUser = async (settings, token) => {
  let db = makeConnection();

  return new Promise(async (resolve, reject) => {
    for(let [key, value] of Object.entries(settings)) {
      if(!await checkUserColumn(key)) {
        return reject("Unknown option "+key);
      } else {

        db.query(`UPDATE users SET ${key}=? WHERE token=?`, [value, token], (err, rows) => {
          if(err) {
            if(err.code == "ER_DUP_ENTRY") {
              db.end();
              reject("This " + key + " is already exist");
              return;
            } else {
              db.end();
              reject(err);
              return;
            }
          }
        });
        if(key == "token") token = value
      }
      await sleep(100);
    }
    module.exports.getUserByToken(token, ["LOWER(username) as username", 'email', 'last_login', 'created_at', 'name', 'bio', 'ip', 'token'])
    .then(rows => {
      return resolve(rows[0]);
    })
    .catch(err => {
      return reject(err);
    });
  })
}

module.exports.createUser = (settings) => {
  let {username, password, token, ip, email} = settings;
  let db = makeConnection();
  return new Promise(async (resolve, reject) => {
    db.query(`INSERT INTO users (username, password, token, created_at, last_login, ip, email) VALUES (?, ?, ?, ?, ?, ?, ?)`, [username, password, token, date(), date(), ip, email])

    await sleep(100);

    module.exports.getUserByToken(token, ["token"])
    .then(rows => {
      return resolve(rows[0]);
    })
    .catch(err => {
      return reject(err);
    });
  });
}

module.exports.deleteUser = (token) => {
  let db = makeConnection();
  return new Promise(async (resolve, reject) => {
    module.exports.getUserByToken(token, ["token"])
    .then(rows => {
      db.query(`DELETE FROM users WHERE token=?`, [token]);
      return resolve(true);
    })
    .catch(err => {
      return reject(err);
    });

  });
}
