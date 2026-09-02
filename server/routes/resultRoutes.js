const express = require("express");

const router = express.Router();

const {
    submitResult,
    getAllResults
} = require("../controllers/resultController");

router.post("/submit", submitResult);
router.get("/all", getAllResults);

module.exports = router;