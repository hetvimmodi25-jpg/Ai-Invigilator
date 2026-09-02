import re

file_path = r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add miniVideoRef
content = content.replace(
    'const videoRef = useRef(null);',
    'const videoRef = useRef(null);\n  const miniVideoRef = useRef(null);'
)

# 2. Assign stream to miniVideoRef
old_stream = '''            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await new Promise((resolve) => {
                    videoRef.current.onloadedmetadata = resolve;
                });
                await videoRef.current.play();'''
new_stream = '''            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                if (miniVideoRef.current) miniVideoRef.current.srcObject = stream;
                
                await new Promise((resolve) => {
                    videoRef.current.onloadedmetadata = resolve;
                });
                await videoRef.current.play();
                if (miniVideoRef.current) await miniVideoRef.current.play();'''
content = content.replace(old_stream, new_stream)

# 3. Fix the duplicate ref and make it larger
old_mini = '''<div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
  <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      width="320"
      height="240"
  />'''
new_mini = '''<div className="w-16 h-16 rounded-2xl overflow-hidden border border-outline-variant">
  <video
      ref={miniVideoRef}
      autoPlay
      muted
      playsInline
      width="320"
      height="240"
      className="w-full h-full object-cover"
  />'''
content = content.replace(old_mini, new_mini)

# 4. Fix head direction logic
old_head = '''const diffX = nose.x - centerX;
  const diffY = nose.y - centerY;
  
  let direction = "LOOKING CENTER";
  
  if (diffX > 0.015) direction = "LOOKING RIGHT";
  else if (diffX < -0.015) direction = "LOOKING LEFT";
  else if (diffY < -0.02) direction = "LOOKING UP";
  else if (diffY > 0.02) direction = "LOOKING DOWN";'''

new_head = '''const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const distLeft = Math.abs(nose.x - leftEye.x);
  const distRight = Math.abs(nose.x - rightEye.x);
  const distUp = Math.abs(nose.y - top.y);
  const distDown = Math.abs(nose.y - bottom.y);
  
  let direction = "LOOKING CENTER";
  
  // Ratios for eye distances (if one is much smaller than the other, head is turned)
  if (distLeft < distRight * 0.4) direction = "LOOKING LEFT";
  else if (distRight < distLeft * 0.4) direction = "LOOKING RIGHT";
  else if (distUp < distDown * 0.5) direction = "LOOKING UP";
  else if (distDown < distUp * 0.5) direction = "LOOKING DOWN";'''
content = content.replace(old_head, new_head)

# 5. Fix blocking alerts
old_full = '''        if (!full) {
            reportIncident("FULLSCREEN_EXIT", "Exited Fullscreen", "HIGH", "Candidate exited full-screen mode.");
            alert("Warning! Full-screen mode must remain enabled.");
        }'''
new_full = '''        if (!full) {
            reportIncident("FULLSCREEN_EXIT", "Exited Fullscreen", "HIGH", "Candidate exited full-screen mode.");
            setActiveWarning({ title: "Fullscreen Exited", message: "Warning! Full-screen mode must remain enabled." });
            setIsWarningDismissed(false);
            setIsWarningHidden(false);
        }'''
content = content.replace(old_full, new_full)

old_tab = '''        if (document.hidden || !document.hasFocus()) {
            setTabWarning(true);
            alert("Warning: Do not switch tabs or change windows during the exam!");
            reportIncident("TAB_SWITCH", "Tab Switched or Unfocused", "HIGH", "Student changed tab or window lost focus.");
        }'''
new_tab = '''        if (document.hidden || !document.hasFocus()) {
            setTabWarning(true);
            setActiveWarning({ title: "Tab Switched", message: "Warning: Do not switch tabs or change windows during the exam!" });
            setIsWarningDismissed(false);
            setIsWarningHidden(false);
            reportIncident("TAB_SWITCH", "Tab Switched or Unfocused", "HIGH", "Student changed tab or window lost focus.");
        }'''
content = content.replace(old_tab, new_tab)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Applied fixes for camera, headpose, and alerts")
