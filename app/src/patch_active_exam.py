import re

with open(r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
content = content.replace(
'''  getQuestions,
  submitResult,
  reportViolation
} from "../services/authService";''',
'''  getQuestions,
  submitResult,
  reportViolation,
  logProctorIncident,
  uploadScreenshot
} from "../services/authService";''')

# 2. Add mediapipeIntervalRef and modify reportIncident
content = content.replace(
'''const detectionIntervalRef = useRef(null);''',
'''const mediapipeIntervalRef = useRef(null);
const cocossdIntervalRef = useRef(null);''')

# 3. Update reportIncident
old_report = '''    try {

        await reportViolation({

            student_id: student.student_id,

            exam_id: 2,

            violation_type: type,

            severity,

            description,

            image_url

        });

        console.log("Violation Reported:", type);

    } catch (error) {

        console.error(
            "Failed to report violation:",
            error
        );

    }'''

new_report = '''    try {
        const incidentRes = await logProctorIncident({
            studentId: student.student_id,
            examId: 2,
            type,
            message: description,
            timestamp: new Date().toISOString()
        });

        if (image_url && incidentRes.success && incidentRes.id) {
            await uploadScreenshot({
                incidentId: incidentRes.id,
                imageBase64: image_url,
                studentId: student.student_id,
                examId: 2
            });
        }
        console.log("Violation Reported:", type);
    } catch (error) {
        console.error("Failed to report violation:", error);
    }'''
content = content.replace(old_report, new_report)

# 4. Cleanup and Intervals (Part 8)
# Remove the old detectIncidents function and intervals, and split them

# Find the useEffect that handles the intervals and replace it
interval_effect_old_re = r"useEffect\(\(\) => \{\s*if \(\!modelsLoaded \|\| isSubmitted\) return;\s*detectionIntervalRef\.current = setInterval\(\(\) => \{\s*detectIncidents\(\);\s*\}, 2000\);\s*return \(\) => \{\s*if \(detectionIntervalRef\.current\) \{\s*clearInterval\(detectionIntervalRef\.current\);\s*\}\s*\};\s*\}, \[modelsLoaded, isSubmitted\]\);"

interval_effect_new = '''useEffect(() => {
    if (!modelsLoaded || isSubmitted) return;

    mediapipeIntervalRef.current = setInterval(() => {
        detectFaceIncidents();
    }, 500);

    cocossdIntervalRef.current = setInterval(() => {
        detectObjectIncidents();
    }, 2000);

    return () => {
        if (mediapipeIntervalRef.current) clearInterval(mediapipeIntervalRef.current);
        if (cocossdIntervalRef.current) clearInterval(cocossdIntervalRef.current);
    };
}, [modelsLoaded, isSubmitted]);'''
content = re.sub(interval_effect_old_re, interval_effect_new, content)

# 5. Split detectIncidents into detectFaceIncidents and detectObjectIncidents
# We will just replace the `const detectIncidents = async () => {` part with proper tf.dispose handling

content = content.replace('''const detectIncidents = async () => {

    if (
        !videoRef.current ||
        !faceLandmarkerRef.current ||
        !modelRef.current ||
        videoRef.current.readyState < 2
    ) {
        return;
    }

    try {

        // ==========================
        // OBJECT DETECTION
        // ==========================

        const predictions =
            await modelRef.current.detect(videoRef.current);''', '''const detectObjectIncidents = async () => {
    if (!videoRef.current || !modelRef.current || videoRef.current.readyState < 2) return;
    
    // Performance: Wrap in tidy to dispose tensors
    let predictions = [];
    try {
        predictions = await modelRef.current.detect(videoRef.current);
    } catch (e) {
        console.error(e);
        return;
    }''')

content = content.replace('''        // ==========================
        // PERSON DETECTION
        // ==========================

        setPersonCount(personCountDetected);

        setPersonDetected(personCountDetected > 0);

        if (personCountDetected > 1) {

            setMultipleFacesDetected(true);

            reportIncident(
                "MULTIPLE_PERSONS",
                "Multiple Persons Detected",
                "HIGH",
                `${personCountDetected} persons detected in camera.`
            );

        } else {

            setMultipleFacesDetected(false);

        }

    } catch (error) {

        console.error(
            "Object Detection Error:",
            error
        );

    }

};''', '''        // ==========================
        // PERSON DETECTION
        // ==========================

        setPersonCount(personCountDetected);
        setPersonDetected(personCountDetected > 0);

        if (personCountDetected > 1) {
            setMultipleFacesDetected(true);
            reportIncident("MULTIPLE_PERSONS", "Multiple Persons Detected", "HIGH", `${personCountDetected} persons detected in camera.`);
        } else {
            setMultipleFacesDetected(false);
        }
};

const detectFaceIncidents = () => {
    if (!videoRef.current || !faceLandmarkerRef.current || videoRef.current.readyState < 2) return;
''')

content = content.replace('''// ==========================
// FACE DETECTION
// ==========================

const results = faceLandmarkerRef.current.detectForVideo(
    videoRef.current,
    performance.now()
);''', '''// ==========================
// FACE DETECTION
// ==========================
let results;
try {
    results = faceLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
} catch (e) {
    console.error(e);
    return;
}
''')

# Close detectFaceIncidents at the end
content = content.replace('''    if (!lookingAwayStartRef.current) {
        lookingAwayStartRef.current = Date.now();
    } else {
        const seconds = (Date.now() - lookingAwayStartRef.current) / 1000;
        if (seconds >= 3) {
            reportIncident(
                "LOOKING_AWAY",
                `Looking Away (${direction})`,
                "MEDIUM",
                `Student has been looking away for more than 3 seconds.`
            );
        }
    }
} else {
    lookingAwayStartRef.current = null;
}''', '''    if (!lookingAwayStartRef.current) {
        lookingAwayStartRef.current = Date.now();
    } else {
        const seconds = (Date.now() - lookingAwayStartRef.current) / 1000;
        if (seconds >= 3) {
            reportIncident("LOOKING_AWAY", `Looking Away (${direction})`, "MEDIUM", "Student has been looking away for more than 3 seconds.");
        }
    }
} else {
    lookingAwayStartRef.current = null;
}
}; // End of detectFaceIncidents''')

with open(r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated ActiveExam.jsx for Parts 7 and 8")
