const express = require("express");
const router = express.Router();
const proctorController = require("../controllers/proctorController");

// New Proctor Incident API
router.post("/incident", proctorController.logIncident);
router.post("/screenshot", proctorController.uploadScreenshot);
router.get("/incidents", proctorController.getAllIncidents);
router.put("/incident/:id/status", proctorController.updateIncidentStatus);

// Live Monitoring
router.post("/ping", proctorController.pingSession);
router.get("/live", proctorController.getLiveSessions);
router.get("/live-feed/:studentId", proctorController.getStudentLiveFeed);
router.delete("/live/:studentId", proctorController.endSession);
router.post("/notify/:studentId", proctorController.sendNotification);
router.post("/flag/:studentId", proctorController.flagSession);
router.get("/dashboard", proctorController.getDashboardStats);
router.get("/export", proctorController.exportReport);
router.post("/create-session", proctorController.createSession);
module.exports = router;
