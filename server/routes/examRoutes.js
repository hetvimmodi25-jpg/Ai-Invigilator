const express = require("express");
const router = express.Router();

const {
    startExam,
    getQuestions,
    reportViolation,
    generateAIExam,
    saveGeneratedExam,
    getAllExams,
    deleteExam
} = require("../controllers/examController");

router.get("/all", getAllExams);
router.delete("/:examId", deleteExam);
router.post("/start", startExam);
router.get("/questions/:examId", getQuestions);
router.post("/violation", reportViolation);

// AI Exam Generator routes
router.post("/generate-ai", generateAIExam);
router.post("/save-generated", saveGeneratedExam);

module.exports = router;