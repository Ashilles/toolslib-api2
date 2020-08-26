var express = require('express');
var router = express.Router();

router.use("/join", require("./join"));
router.use("/login", require("./login"));

module.exports = router;
