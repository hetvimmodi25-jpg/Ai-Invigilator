const pool = require("../config/db");
const fs = require("fs");
const path = require("path");

exports.logIncident = async (req, res) => {
    try {
        const { studentId, examId, type, message, timestamp } = req.body;

        const result = await pool.query(
            `INSERT INTO exam_incidents (student_id, exam_id, incident_type, message)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [studentId, examId, type, message]
        );

        res.json({
            success: true,
            message: "Incident logged successfully",
            id: result.rows[0].id
        });

    } catch (err) {
        console.error("Error logging incident:", err);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

exports.uploadScreenshot = async (req, res) => {
    try {
        const { incidentId, imageBase64, studentId, examId } = req.body;

        if (!imageBase64 || !incidentId) {
            return res.status(400).json({ success: false, message: "Missing image or incident ID" });
        }

        // Remove Base64 header if present
        const base64Data = imageBase64.replace(/^data:image\/jpeg;base64,/, "").replace(/^data:image\/png;base64,/, "");

        const filename = `incident_${studentId}_${examId}_${incidentId}_${Date.now()}.jpg`;
        const filepath = path.join(__dirname, "..", "uploads", "incidents", filename);

        fs.writeFileSync(filepath, base64Data, 'base64');

        await pool.query(
            `UPDATE exam_incidents SET image_filename = $1 WHERE id = $2`,
            [filename, incidentId]
        );

        res.json({
            success: true,
            message: "Screenshot uploaded successfully",
            filename
        });

    } catch (err) {
        console.error("Error uploading screenshot:", err);
        res.status(500).json({
            success: false,
            message: "Server Error"
        });
    }
};

exports.getAllIncidents = async (req, res) => {
    try {
        const query = `
            SELECT 
                i.id,
                i.incident_type as type,
                i.message,
                i.created_at as timestamp,
                i.image_filename,
                i.status,
                s.full_name as "studentName"
            FROM exam_incidents i
            JOIN students s ON i.student_id = s.student_id
            ORDER BY i.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({
            success: true,
            incidents: result.rows
        });
    } catch (err) {
        console.error("Error fetching incidents:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.updateIncidentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await pool.query(
            "UPDATE exam_incidents SET status = $1 WHERE id = $2",
            [status, id]
        );
        
        res.json({ success: true, message: "Status updated successfully" });
    } catch (err) {
        console.error("Error updating incident status:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// LIVE MONITORING

exports.pingSession = async (req, res) => {
    try {
        const {
            studentId,
            examName,
            status,
            snapshot,
            screenSnapshot,
            aiConfidence,
            faceStatus,
            eyeStatus,
            headDirection,
            phoneDetected,
            multipleDetected,
            audioStatus,
            audioLevel
        } = req.body;

        const confidence = typeof aiConfidence === 'number' ? aiConfidence : (status === 'Flagged' || status === 'Suspicious' ? 45 : (status === 'Warning' ? 70 : 95));
        const finalStatus = status || (confidence < 50 ? 'Suspicious' : (confidence < 80 ? 'Warning' : 'Normal'));

        // 1. Update live session
        await pool.query(
            `INSERT INTO live_sessions (
                student_id, exam_name, status, last_ping,
                ai_confidence, face_status, eye_status, head_direction,
                phone_detected, multiple_detected,
                audio_status, audio_level
             )
             VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (student_id) DO UPDATE 
             SET last_ping = NOW(),
                 status = $3,
                 exam_name = $2,
                 ai_confidence = $4,
                 face_status = $5,
                 eye_status = $6,
                 head_direction = $7,
                 phone_detected = $8,
                 multiple_detected = $9,
                 audio_status = $10,
                 audio_level = $11`,
            [
                studentId,
                examName,
                finalStatus,
                confidence,
                faceStatus || 'STABLE',
                eyeStatus || 'OPEN',
                headDirection || 'CENTERED',
                !!phoneDetected,
                !!multipleDetected,
                audioStatus || 'QUIET',
                parseInt(audioLevel, 10) || 0
            ]
        );

        const snapshotPath = path.join(__dirname, '..', 'uploads', 'snapshots');
        if (!fs.existsSync(snapshotPath)) {
            fs.mkdirSync(snapshotPath, { recursive: true });
        }

        // 2. Save webcam snapshot if provided
        if (snapshot) {
            const base64Data = snapshot.replace(/^data:image\/\w+;base64,/, "");
            const filename = `student_${studentId}.jpg`;
            fs.writeFileSync(path.join(snapshotPath, filename), base64Data, 'base64');
        }

        // 3. Save screen share snapshot if provided
        if (screenSnapshot) {
            const base64ScreenData = screenSnapshot.replace(/^data:image\/\w+;base64,/, "");
            const screenFilename = `student_${studentId}_screen.jpg`;
            fs.writeFileSync(path.join(snapshotPath, screenFilename), base64ScreenData, 'base64');
        }

        // 4. Fetch unread messages
        const msgs = await pool.query(
            "SELECT id, message FROM student_messages WHERE student_id = $1 AND is_read = false",
            [studentId]
        );
        
        if (msgs.rows.length > 0) {
            await pool.query(
                "UPDATE student_messages SET is_read = true WHERE student_id = $1",
                [studentId]
            );
        }

        // 5. Fetch forced flagged status (if admin flagged it, it overrides client status)
        const sessionCheck = await pool.query(
            "SELECT status FROM live_sessions WHERE student_id = $1",
            [studentId]
        );
        const serverStatus = sessionCheck.rows.length > 0 ? sessionCheck.rows[0].status : finalStatus;
        
        res.json({ 
            success: true, 
            messages: msgs.rows,
            serverStatus
        });
    } catch (err) {
        console.error("Error pinging session:", err);
        res.status(500).json({ success: false });
    }
};

exports.getLiveSessions = async (req, res) => {
    try {
        const query = `
            SELECT 
                l.student_id as id,
                l.exam_name as exam,
                l.status,
                l.ai_confidence as "aiConfidence",
                l.face_status as "faceStatus",
                l.eye_status as "eyeStatus",
                l.head_direction as "headDirection",
                l.phone_detected as "phoneDetected",
                l.multiple_detected as "multipleDetected",
                l.audio_status as "audioStatus",
                l.audio_level as "audioLevel",
                l.last_ping as "lastPing",
                s.full_name as name,
                s.enrollment_no as "enrollmentNo",
                s.course,
                s.semester,
                s.profile_photo as "profilePhoto",
                (SELECT COUNT(*) FROM exam_incidents i WHERE i.student_id = l.student_id) as "violationCount"
            FROM live_sessions l
            JOIN students s ON l.student_id = s.student_id
            ORDER BY 
                CASE 
                    WHEN l.status = 'Flagged' OR l.status = 'Suspicious' THEN 1
                    WHEN l.status = 'Warning' THEN 2
                    ELSE 3
                END,
                l.last_ping DESC
        `;
        const result = await pool.query(query);
        res.json({
            success: true,
            sessions: result.rows
        });
    } catch (err) {
        console.error("Error fetching live sessions:", err);
        res.status(500).json({ success: false });
    }
};

exports.getStudentLiveFeed = async (req, res) => {
    try {
        const { studentId } = req.params;

        const sessionRes = await pool.query(`
            SELECT 
                l.student_id as id,
                l.exam_name as exam,
                l.status,
                l.ai_confidence as "aiConfidence",
                l.face_status as "faceStatus",
                l.eye_status as "eyeStatus",
                l.head_direction as "headDirection",
                l.phone_detected as "phoneDetected",
                l.multiple_detected as "multipleDetected",
                l.audio_status as "audioStatus",
                l.audio_level as "audioLevel",
                l.last_ping as "lastPing",
                s.full_name as name,
                s.enrollment_no as "enrollmentNo",
                s.course,
                s.semester,
                s.profile_photo as "profilePhoto"
            FROM live_sessions l
            JOIN students s ON l.student_id = s.student_id
            WHERE l.student_id = $1
        `, [studentId]);

        if (sessionRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Student session not found" });
        }

        const incidentsRes = await pool.query(`
            SELECT id, incident_type as type, message, created_at as timestamp, status
            FROM exam_incidents
            WHERE student_id = $1
            ORDER BY created_at DESC
            LIMIT 10
        `, [studentId]);

        const session = sessionRes.rows[0];
        res.json({
            success: true,
            session: {
                ...session,
                incidents: incidentsRes.rows,
                webcamFeedUrl: `/uploads/snapshots/student_${studentId}.jpg`,
                screenFeedUrl: `/uploads/snapshots/student_${studentId}_screen.jpg`
            }
        });
    } catch (err) {
        console.error("Error fetching student live feed:", err);
        res.status(500).json({ success: false });
    }
};

exports.endSession = async (req, res) => {
    try {
        const { studentId } = req.params;
        await pool.query("DELETE FROM live_sessions WHERE student_id = $1", [studentId]);
        res.json({ success: true });
    } catch (err) {
        console.error("Error ending session:", err);
        res.status(500).json({ success: false });
    }
};

exports.sendNotification = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { message } = req.body;
        await pool.query(
            "INSERT INTO student_messages (student_id, message) VALUES ($1, $2)",
            [studentId, message]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Error sending notification:", err);
        res.status(500).json({ success: false });
    }
};

exports.flagSession = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        // Update live session status
        await pool.query(
            "UPDATE live_sessions SET status = 'Suspicious', ai_confidence = 35 WHERE student_id = $1",
            [studentId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Error flagging session:", err);
        res.status(500).json({ success: false });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        // 1. Online students
        const onlineRes = await pool.query("SELECT COUNT(*) FROM live_sessions WHERE last_ping >= NOW() - INTERVAL '15 seconds'");
        const onlineStudents = parseInt(onlineRes.rows[0].count, 10);

        // 2. Active exams
        const examsRes = await pool.query("SELECT COUNT(DISTINCT exam_name) FROM live_sessions WHERE last_ping >= NOW() - INTERVAL '15 seconds'");
        const activeExams = parseInt(examsRes.rows[0].count, 10);

        // 3. Total violations & Today's alerts
        const violationsRes = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN created_at::date = CURRENT_DATE THEN 1 ELSE 0 END) as today
            FROM exam_incidents
        `);
        const totalViolations = parseInt(violationsRes.rows[0].total, 10) || 0;
        const todaysAlerts = parseInt(violationsRes.rows[0].today, 10) || 0;

        // 4. Violation stats by type
        const statsRes = await pool.query(`
            SELECT incident_type, COUNT(*) as count 
            FROM exam_incidents 
            GROUP BY incident_type
        `);
        const violationStats = statsRes.rows;

        // 5. Recent alerts (last 5)
        const recentRes = await pool.query(`
            SELECT e.id, e.incident_type, e.message, e.created_at as timestamp, s.full_name as name, e.student_id
            FROM exam_incidents e
            JOIN students s ON e.student_id = s.student_id
            ORDER BY e.created_at DESC
            LIMIT 5
        `);
        const recentAlerts = recentRes.rows;

        // 6. 5 Live students for the preview table
        const previewRes = await pool.query(`
            SELECT 
                l.student_id as id,
                l.exam_name as exam,
                l.status,
                s.full_name as name,
                (SELECT COUNT(*) FROM exam_incidents i WHERE i.student_id = l.student_id) as "violationCount"
            FROM live_sessions l
            JOIN students s ON l.student_id = s.student_id
            WHERE l.last_ping >= NOW() - INTERVAL '15 seconds'
            LIMIT 5
        `);

        res.json({
            success: true,
            onlineStudents,
            activeExams,
            totalViolations,
            todaysAlerts,
            violationStats,
            recentAlerts,
            previewStudents: previewRes.rows
        });
    } catch (err) {
        console.error("Error getting dashboard stats:", err);
        res.status(500).json({ success: false });
    }
};

exports.exportReport = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.id, e.student_id, s.full_name, e.incident_type, e.message, e.created_at
            FROM exam_incidents e
            JOIN students s ON e.student_id = s.student_id
            ORDER BY e.created_at DESC
        `);
        
        // Build CSV string
        let csv = 'Incident ID,Student ID,Student Name,Incident Type,Message,Timestamp\n';
        result.rows.forEach(row => {
            const date = new Date(row.created_at).toISOString();
            csv += `${row.id},${row.student_id},"${row.full_name}","${row.incident_type}","${row.message}",${date}\n`;
        });

        res.header('Content-Type', 'text/csv');
        res.attachment('exam_incidents_report.csv');
        res.send(csv);
    } catch (err) {
        console.error("Error exporting report:", err);
        res.status(500).send("Error generating report");
    }
};

exports.createSession = async (req, res) => {
    try {
        const { examName, subject, duration } = req.body;
        
        await pool.query(
            `INSERT INTO exams (exam_name, subject, duration, total_marks, exam_date, start_time, end_time, created_by)
             VALUES ($1, $2, $3, 100, CURRENT_DATE, CURRENT_TIME, CURRENT_TIME + interval '1 hour', 1)`,
            [examName || 'New Exam', subject || 'General', parseInt(duration) || 60]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("Error creating session:", err);
        res.status(500).json({ success: false });
    }
};
