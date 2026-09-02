import re

file_path = r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Badge change
content = content.replace(
    '1080x1080 @ 120FPS</div>',
    '1920x1080 @ 120FPS</div>'
).replace(
    'px-3 py-1 rounded-full text-white \ntext-[10px] font-mono',
    'px-4 py-1.5 rounded-3xl text-white text-xs font-mono'
).replace(
    'px-3 py-1 rounded-full text-white text-[10px] font-mono',
    'px-4 py-1.5 rounded-3xl text-white text-xs font-mono'
)

# 2. Intervals faster
content = re.sub(
    r'mediapipeIntervalRef\.current = setInterval\(\(\) => \{\s*detectFaceIncidents\(\);\s*\}, 500\);',
    'mediapipeIntervalRef.current = setInterval(() => { detectFaceIncidents(); }, 200);',
    content
)
content = re.sub(
    r'cocossdIntervalRef\.current = setInterval\(\(\) => \{\s*detectObjectIncidents\(\);\s*\}, 2000\);',
    'cocossdIntervalRef.current = setInterval(() => { detectObjectIncidents(); }, 1000);',
    content
)

# 3. Head Pose logic
old_head = '''const diffX = nose.x - centerX;
  const diffY = nose.y - centerY;
  
  let direction = "LOOKING CENTER";
  
  if (diffX > 0.03) direction = "LOOKING RIGHT";
  else if (diffX < -0.03) direction = "LOOKING LEFT";
  else if (diffY < -0.05) direction = "LOOKING UP";
  else if (diffY > 0.05) direction = "LOOKING DOWN";'''
new_head = '''const diffX = nose.x - centerX;
  const diffY = nose.y - centerY;
  
  let direction = "LOOKING CENTER";
  
  if (diffX > 0.015) direction = "LOOKING RIGHT";
  else if (diffX < -0.015) direction = "LOOKING LEFT";
  else if (diffY < -0.02) direction = "LOOKING UP";
  else if (diffY > 0.02) direction = "LOOKING DOWN";'''
content = content.replace(old_head, new_head)

# Timer logic for head pose
old_timer = '''const seconds = (Date.now() - lookingAwayStartRef.current) / 1000;
        if (seconds >= 3) {
            reportIncident("LOOKING_AWAY", `Looking Away (${direction})`, "MEDIUM", "Student has been looking away for more than 3 seconds.");
        }'''
new_timer = '''const seconds = (Date.now() - lookingAwayStartRef.current) / 1000;
        if (seconds >= 1) {
            reportIncident("LOOKING_AWAY", `Looking Away (${direction})`, "MEDIUM", "Student is not looking at the screen.");
        }'''
content = content.replace(old_timer, new_timer)

# 4. Object Detection logic
old_obj = '''        let phoneFound = false;
        let personCountDetected = 0;

        predictions.forEach((prediction) => {

            if (
                prediction.class === "cell phone" &&
                prediction.score > 0.60
            ) {
                phoneFound = true;
            }

            if (
                prediction.class === "person"
            ) {
                personCountDetected++;
            }

        });'''
new_obj = '''        let objectFound = false;
        let detectedObject = "";
        let personCountDetected = 0;

        predictions.forEach((prediction) => {
            const forbidden = ["cell phone", "book", "remote"]; // Adjusted for common detections representing phone/book
            if (forbidden.includes(prediction.class) && prediction.score > 0.50) {
                objectFound = true;
                detectedObject = prediction.class;
            }
            if (prediction.class === "person") {
                personCountDetected++;
            }
        });

        if (objectFound) {
            setPhoneDetected(true);
            reportIncident("UNAUTHORIZED_OBJECT", `Unauthorized object detected: ${detectedObject}`, "HIGH", `Student has a ${detectedObject}`);
        } else {
            setPhoneDetected(false);
        }'''
content = content.replace(old_obj, new_obj)

# 5. Tab switch alert
old_tab = '''        if (document.hidden || !document.hasFocus()) {
            setTabWarning(true);
            reportIncident("TAB_SWITCH", "Tab Switched or Unfocused", "HIGH", "Student changed tab or window lost focus.");
        }'''
new_tab = '''        if (document.hidden || !document.hasFocus()) {
            setTabWarning(true);
            alert("Warning: Do not switch tabs or change windows during the exam!");
            reportIncident("TAB_SWITCH", "Tab Switched or Unfocused", "HIGH", "Student changed tab or window lost focus.");
        }'''
content = content.replace(old_tab, new_tab)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated constraints.")
