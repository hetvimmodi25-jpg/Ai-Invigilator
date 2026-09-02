const pool = require("../config/db");

const submitResult = async (req, res) => {
    try {
        const {
            student_id,
            exam_id,
            score,
            total_marks
        } = req.body;

        const result = await pool.query(
            `
            INSERT INTO results
            (student_id, exam_id, score, total_marks)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            [student_id, exam_id, score, total_marks]
        );

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Error saving result"
        });
    }
};
const getAllResults = async (req, res) => {
    try {
       
const result = await pool.query(`
    WITH result_boundaries AS (
        SELECT 
            r.result_id,
            COALESCE(
                LAG(r.submitted_at) OVER (PARTITION BY r.student_id, r.exam_id ORDER BY r.submitted_at), 
                '1970-01-01'::timestamp
            ) as previous_submitted_at
        FROM results r
    )
    SELECT
        r.result_id,
        s.student_id,
        s.full_name,
        s.email,
        s.profile_photo,
        e.exam_name,
        r.score,
        r.total_marks,
        r.submitted_at,
        (SELECT COUNT(*) FROM exam_incidents i 
         WHERE i.student_id = r.student_id AND i.exam_id = r.exam_id AND i.incident_type ILIKE '%tab%'
         AND i.created_at <= r.submitted_at 
         AND i.created_at > b.previous_submitted_at) as tab_switches,
        (SELECT COUNT(*) FROM exam_incidents i 
         WHERE i.student_id = r.student_id AND i.exam_id = r.exam_id AND (i.incident_type ILIKE '%phone%' OR i.incident_type ILIKE '%mobile%')
         AND i.created_at <= r.submitted_at 
         AND i.created_at > b.previous_submitted_at) as phone_detected,
        (SELECT COUNT(*) FROM exam_incidents i 
         WHERE i.student_id = r.student_id AND i.exam_id = r.exam_id AND i.incident_type ILIKE '%multi%'
         AND i.created_at <= r.submitted_at 
         AND i.created_at > b.previous_submitted_at) as multi_faces,
        (SELECT COUNT(*) FROM exam_incidents i 
         WHERE i.student_id = r.student_id AND i.exam_id = r.exam_id AND (i.incident_type ILIKE '%screen%' OR i.incident_type ILIKE '%exit%')
         AND i.created_at <= r.submitted_at 
         AND i.created_at > b.previous_submitted_at) as fullscreen_exits,
        (SELECT COUNT(*) FROM exam_incidents i 
         WHERE i.student_id = r.student_id AND i.exam_id = r.exam_id AND i.incident_type ILIKE '%look%'
         AND i.created_at <= r.submitted_at 
         AND i.created_at > b.previous_submitted_at) as head_movements,
        (SELECT COUNT(*) FROM exam_incidents i 
         WHERE i.student_id = r.student_id AND i.exam_id = r.exam_id AND i.incident_type ILIKE '%face_not_detected%'
         AND i.created_at <= r.submitted_at 
         AND i.created_at > b.previous_submitted_at) as no_face_detected,
        (SELECT COUNT(*) FROM exam_incidents i 
         WHERE i.student_id = r.student_id AND i.exam_id = r.exam_id AND i.incident_type ILIKE '%sleep%'
         AND i.created_at <= r.submitted_at 
         AND i.created_at > b.previous_submitted_at) as eyes_closed
    FROM results r
    JOIN result_boundaries b ON r.result_id = b.result_id
    JOIN students s
        ON r.student_id = s.student_id
    JOIN exams e
        ON r.exam_id = e.exam_id
    ORDER BY r.submitted_at DESC
`);
        res.json(result.rows);
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: error.message || "Error fetching results"
        });
    }
};

module.exports = {
    submitResult,
    getAllResults
};