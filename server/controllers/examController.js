const pool = require("../config/db");

// Start Exam
exports.startExam = async (req, res) => {
    try {
        const { student_id, exam_name } = req.body;

        let exam = await pool.query(
            "SELECT * FROM exams WHERE exam_name ILIKE $1",
            [`%${exam_name || ''}%`]
        );

        if (exam.rows.length === 0) {
            exam = await pool.query("SELECT * FROM exams ORDER BY exam_id ASC LIMIT 1");
        }

        if (exam.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No active exam found"
            });
        }

        res.json({
            success: true,
            exam: exam.rows[0]
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
// Seeded Pseudo-Random Number Generator (Mulberry32) for deterministic per-student question sequence
function createPRNG(seedString) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedString.length; i++) {
        h = Math.imul(h ^ seedString.charCodeAt(i), 16777619);
    }
    return function() {
        h += h << 13; h ^= h >>> 7;
        h += h << 3;  h ^= h >>> 17;
        return ((h += h << 5) >>> 0) / 4294967296;
    };
}

function shuffleQuestionsForStudent(questions, studentId, examId) {
    if (!Array.isArray(questions) || questions.length === 0) return [];
    const seed = `student_${studentId || 'default'}_exam_${examId}`;
    const rng = createPRNG(seed);
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Get Questions (Deterministic randomized sequence per student)
exports.getQuestions = async (req, res) => {
    try {
        const { examId } = req.params;
        const studentId = req.query.student_id || req.query.studentId || '';

        const result = await pool.query(
            "SELECT * FROM questions WHERE exam_id = $1 ORDER BY question_id ASC",
            [examId]
        );

        let questions = result.rows;
        if (studentId) {
            questions = shuffleQuestionsForStudent(questions, studentId, examId);
        }

        res.json({
            success: true,
            questions: questions
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


// Report Violation
exports.reportViolation = async (req, res) => {
    try {
        const { student_id, exam_id, violation_type, severity, description, image_url } = req.body;

        // Find the student_exam_id
        const studentExam = await pool.query(
            "SELECT student_exam_id FROM student_exams WHERE student_id = $1 AND exam_id = $2",
            [student_id, exam_id]
        );

        let student_exam_id = null;
        if (studentExam.rows.length > 0) {
            student_exam_id = studentExam.rows[0].student_exam_id;
        }

        const violationResult = await pool.query(
            `INSERT INTO violations (student_exam_id, violation_type, severity, description, violation_time)
             VALUES ($1, $2, $3, $4, NOW()) RETURNING violation_id`,
            [student_exam_id, violation_type, severity, description]
        );

        const violation_id = violationResult.rows[0].violation_id;

        if (image_url) {
            await pool.query(
                `INSERT INTO violation_evidence (violation_id, image_url, captured_at)
                 VALUES ($1, $2, NOW())`,
                [violation_id, image_url]
            );
        }

        res.json({ success: true, violation_id });
    } catch (error) {
        console.error("Violation report error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// --- AI Exam Generator (LLM Integration) ---
exports.generateAIExam = async (req, res) => {
    try {
        const { topic, excerpt, questionTypes, count, difficulty, examName, duration, totalMarks } = req.body;

        const apiKey = process.env.GEMINI_API_KEY;
        let generatedQuestions = [];

        if (apiKey) {
            const promptText = `You are an expert academic assessment generator. Generate an exam titled "${examName || topic}" with ${count || 5} questions based on the following input material/topic:
Topic/Content: ${topic || ''}
${excerpt ? `Context Excerpt:\n${excerpt}` : ''}
Difficulty: ${difficulty || 'Medium'}
Requested Question Types: ${Array.isArray(questionTypes) ? questionTypes.join(', ') : 'MCQ, CODING, DESCRIPTIVE'}

Generate structured JSON array of questions matching this schema:
[
  {
    "type": "MCQ",
    "question_text": "Question statement here",
    "option_a": "Option A text",
    "option_b": "Option B text",
    "option_c": "Option C text",
    "option_d": "Option D text",
    "correct_option": "A",
    "rubric": "Explanation of correct answer"
  },
  {
    "type": "CODING",
    "question_text": "Coding problem statement",
    "option_a": "", "option_b": "", "option_c": "", "option_d": "", "correct_option": "",
    "starter_code": "function solution() {\\n  // write code here\\n}",
    "rubric": "Test Case 1: Input 5 -> Expected Output 10\\nTest Case 2: Input 0 -> Expected Output 0"
  },
  {
    "type": "DESCRIPTIVE",
    "question_text": "Descriptive concept question",
    "option_a": "", "option_b": "", "option_c": "", "option_d": "", "correct_option": "",
    "rubric": "Criteria 1: Clarity of concept (4 marks)\\nCriteria 2: Examples provided (3 marks)\\nCriteria 3: Proper technical terms (3 marks)"
  }
]
Return ONLY a valid JSON array. No markdown, no extra commentary.`;

            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
                const apiRes = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }]
                    })
                });

                if (apiRes.ok) {
                    const data = await apiRes.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
                    generatedQuestions = JSON.parse(cleanJson);
                }
            } catch (pe) {
                console.error("LLM API Call Error:", pe);
            }
        }

        // Intelligent fallback question generator if API key not set or LLM call failed
        if (!generatedQuestions || generatedQuestions.length === 0) {
            const requestedCount = Math.min(Math.max(parseInt(count, 10) || 50, 1), 50);

            const mcqTemplates = [
                {
                    type: "MCQ",
                    question_text: "What is the primary objective of memory management in operating systems and backend services?",
                    option_a: "Dynamically allocating and reclaiming memory blocks for active processes",
                    option_b: "Translating high-level source code directly into hardware logic gates",
                    option_c: "Encrypting static database records stored on physical disk drives",
                    option_d: "Configuring network IP addresses for TCP socket connections",
                    correct_option: "A",
                    rubric: "Option A is correct. Memory management tracks allocation state and prevents memory leaks during process execution."
                },
                {
                    type: "MCQ",
                    question_text: "Which computational time complexity best characterizes optimal search in balanced tree structures?",
                    option_a: "O(1)",
                    option_b: "O(log n)",
                    option_c: "O(n^2)",
                    option_d: "O(2^n)",
                    correct_option: "B",
                    rubric: "Option B is correct. Balanced search structures divide search space in half at each step, yielding O(log n) efficiency."
                },
                {
                    type: "MCQ",
                    question_text: "Which architectural pattern provides high fault tolerance and scalability in distributed application systems?",
                    option_a: "Tight coupling between database models and view controllers",
                    option_b: "Stateless microservices with asynchronous event streams",
                    option_c: "Storing user state exclusively in volatile local memory",
                    option_d: "Monolithic single-threaded blocking event loops",
                    correct_option: "B",
                    rubric: "Option B is correct. Stateless services combined with event queues allow horizontal scaling and graceful failure recovery."
                },
                {
                    type: "MCQ",
                    question_text: "Which mechanism prevents deadlock conditions during concurrent thread execution?",
                    option_a: "Hierarchical resource ordering and lock preemption",
                    option_b: "Ignoring race conditions during async loop iterations",
                    option_c: "Increasing physical CPU clock speeds dynamically",
                    option_d: "Disabling garbage collection during runtime execution",
                    correct_option: "A",
                    rubric: "Option A is correct. Enforcing a strict lock hierarchy eliminates circular wait dependencies."
                },
                {
                    type: "MCQ",
                    question_text: "Which strategy guarantees data durability in database transaction management?",
                    option_a: "Write-Ahead Logging (WAL) before committing to main storage",
                    option_b: "Caching database writes in volatile RAM without disk sync",
                    option_c: "Executing queries asynchronously without rollback logs",
                    option_d: "Using temporary unindexed in-memory tables",
                    correct_option: "A",
                    rubric: "Option A is correct. Write-ahead logging ensures transactions can be safely recovered after system crashes."
                },
                {
                    type: "MCQ",
                    question_text: "In modern full-stack web applications, what is the primary role of middleware components?",
                    option_a: "Intercepting requests to process authentication, logging, and CORS before route handling",
                    option_b: "Compiling client JavaScript into WebAssembly binaries on the server",
                    option_c: "Generating CSS stylesheets dynamically for browser rendering",
                    option_d: "Managing physical hardware network switches and routing cables",
                    correct_option: "A",
                    rubric: "Option A is correct. Middleware functions intercept incoming HTTP requests to handle cross-cutting concerns."
                },
                {
                    type: "MCQ",
                    question_text: "Which HTTP status code range indicates a client-side syntax error or invalid request payload?",
                    option_a: "2xx Success",
                    option_b: "3xx Redirection",
                    option_c: "4xx Client Error",
                    option_d: "5xx Server Error",
                    correct_option: "C",
                    rubric: "Option C is correct. 4xx status codes signal bad request data, invalid auth credentials, or missing resources."
                }
            ];

            const codingTemplate = {
                type: "CODING",
                question_text: "Implement a function 'processData(items)' that filters invalid entries (null, undefined, non-numeric) and computes the aggregated valid total score.",
                option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "",
                starter_code: "function processData(items) {\n  // TODO: Implement solution\n  // Filter invalid entries and return calculated total\n  return items.filter(val => typeof val === 'number' && !isNaN(val)).reduce((sum, n) => sum + n, 0);\n}",
                rubric: "Evaluation Rubric:\n1. Correct edge-case handling (null/empty inputs): 40%\n2. Time Complexity O(n): 30%\n3. Space Complexity O(1): 30%"
            };

            const descriptiveTemplate = {
                type: "DESCRIPTIVE",
                question_text: "Explain the core architectural trade-offs between consistency and availability in distributed database systems. Provide a practical scenario illustrating when to prioritize one over the other.",
                option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "",
                rubric: "Evaluation Rubric (10 Marks Total):\n• Clear definition of Consistency vs Availability: 3 Marks\n• Discussion of CAP Theorem trade-offs: 4 Marks\n• Practical real-world example provided: 3 Marks"
            };

            generatedQuestions = [];
            const types = Array.isArray(questionTypes) && questionTypes.length > 0 ? questionTypes : ['MCQ', 'CODING', 'DESCRIPTIVE'];

            for (let i = 0; i < requestedCount; i++) {
                const currentType = types[i % types.length];
                if (currentType === 'CODING') {
                    generatedQuestions.push({ ...codingTemplate, id: i + 1 });
                } else if (currentType === 'DESCRIPTIVE') {
                    generatedQuestions.push({ ...descriptiveTemplate, id: i + 1 });
                } else {
                    const t = mcqTemplates[i % mcqTemplates.length];
                    generatedQuestions.push({ ...t, id: i + 1 });
                }
            }
        }

        // Clean questions: remove any [Q1], [Q2], [Coding Challenge] prefixes or 'in chapter X' fragments
        generatedQuestions = generatedQuestions.map((q) => {
            let cleanText = (q.question_text || '')
                .replace(/^\[(Q\d+|Coding Challenge\s*\d*|Descriptive\s*Q?\d*)\]\s*/i, '')
                .replace(/\s+in\s+chapter\s*\d+(\s*&\s*chapter\s*\d+)?\??/gi, '?')
                .replace(/\s+for\s+chapter\s*\d+(\s*&\s*chapter\s*\d+)?\??/gi, '?')
                .replace(/\s+in\s+chapter\s*\d+/gi, '')
                .trim();
            
            return {
                ...q,
                question_text: cleanText
            };
        });

        res.json({
            success: true,
            exam_name: examName || `${topic || 'AI Generated'} Assessment`,
            duration_minutes: Math.min(parseInt(duration, 10) || 60, 60),
            total_marks: Math.min(parseInt(totalMarks, 10) || 100, 100),
            questions: generatedQuestions
        });

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ success: false, message: "AI Generation Error" });
    }
};

// Save Generated Exam to PostgreSQL Database
exports.saveGeneratedExam = async (req, res) => {
    try {
        const { exam_name, subject, duration_minutes, total_marks, questions, created_by } = req.body;

        if (!exam_name || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ success: false, message: "Exam name and questions are required" });
        }

        // Insert into exams table
        const examResult = await pool.query(
            `INSERT INTO exams (exam_name, subject, duration_minutes, total_marks, created_at, created_by)
             VALUES ($1, $2, $3, $4, NOW(), $5) RETURNING exam_id`,
            [
                exam_name,
                subject || 'AI Generated',
                parseInt(duration_minutes, 10) || 60,
                parseInt(total_marks, 10) || 100,
                created_by || 1
            ]
        );

        const newExamId = examResult.rows[0].exam_id;

        // Insert questions into questions table
        for (const q of questions) {
            await pool.query(
                `INSERT INTO questions (exam_id, question_text, option_a, option_b, option_c, option_d, correct_option)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    newExamId,
                    q.question_text || 'Untitled Question',
                    q.option_a || (q.starter_code ? `Starter Code:\n${q.starter_code}` : 'N/A'),
                    q.option_b || (q.rubric ? `Rubric:\n${q.rubric}` : 'N/A'),
                    q.option_c || 'N/A',
                    q.option_d || 'N/A',
                    q.correct_option || 'A'
                ]
            );
        }

        res.json({
            success: true,
            message: "Exam successfully saved and published!",
            exam_id: newExamId,
            question_count: questions.length
        });

    } catch (error) {
        console.error("Save Generated Exam Error:", error);
        res.status(500).json({ success: false, message: "Failed to save exam to database" });
    }
};

// Get All Published Exams
exports.getAllExams = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*, 
                    (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.exam_id) as question_count 
             FROM exams e 
             ORDER BY e.created_at DESC`
        );
        res.json({ success: true, exams: result.rows });
    } catch (error) {
        console.error("Fetch exams error:", error);
        res.status(500).json({ success: false, message: "Error fetching published exams" });
    }
};

// Delete Exam
exports.deleteExam = async (req, res) => {
    try {
        const { examId } = req.params;
        await pool.query("DELETE FROM questions WHERE exam_id = $1", [examId]);
        await pool.query("DELETE FROM exams WHERE exam_id = $1", [examId]);
        res.json({ success: true, message: "Exam deleted successfully" });
    } catch (error) {
        console.error("Delete exam error:", error);
        res.status(500).json({ success: false, message: "Error deleting exam" });
    }
};