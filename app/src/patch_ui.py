import re

file_path = r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update UI cards
content = content.replace(
    '<span className="font-mono-sm text-mono-sm text-primary font-bold">STABLE</span>',
    '<span className={`font-mono-sm text-mono-sm font-bold ${!faceDetected ? "text-error" : "text-primary"}`}>{faceDetected ? "STABLE" : "NO FACE"}</span>'
)
content = content.replace(
    '<span className="font-mono-sm text-mono-sm text-primary font-bold">CENTERED</span>',
    '<span className={`font-mono-sm text-mono-sm font-bold ${headDirection !== "LOOKING CENTER" ? "text-error" : "text-primary"}`}>{headDirection}</span>'
)
content = content.replace(
    '<span className="font-mono-sm text-mono-sm text-primary font-bold">NONE</span>',
    '<span className={`font-mono-sm text-mono-sm font-bold ${phoneDetected ? "text-error" : "text-primary"}`}>{phoneDetected ? "DETECTED" : "NONE"}</span>'
)
content = content.replace(
    '<span className="font-mono-sm text-mono-sm text-primary font-bold">MONITORING</span>',
    '<span className={`font-mono-sm text-mono-sm font-bold ${multipleFacesDetected ? "text-error" : "text-primary"}`}>{multipleFacesDetected ? "DETECTED" : "MONITORING"}</span>'
)

# 2. Add "No Face" detection logic
old_no_face = '''if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
    return;
}'''
new_no_face = '''if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
    if (!window.noFaceStartRef) window.noFaceStartRef = Date.now();
    else if ((Date.now() - window.noFaceStartRef) > 2000) {
        setFaceDetected(false);
        setEyeStatus("NO FACE");
        setHeadDirection("NO FACE");
        reportIncident("NO_FACE", "Face Not Detected", "HIGH", "Student face is missing from the camera view.");
        window.noFaceStartRef = null;
    }
    return;
} else {
    window.noFaceStartRef = null;
    setFaceDetected(true);
}'''
content = content.replace(old_no_face, new_no_face)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated UI mappings and no face detection.")
