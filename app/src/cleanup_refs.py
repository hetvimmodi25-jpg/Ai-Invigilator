import re

with open(r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove unused refs
content = re.sub(r'const phoneIntervalRef = useRef\(null\);\s*', '', content)
content = re.sub(r'const lastPhoneDetectionRef = useRef\(0\);\s*', '', content)
content = re.sub(r'const lastPersonDetectionRef = useRef\(0\);\s*', '', content)
content = re.sub(r'const noFaceStartRef = useRef\(null\);\s*', '', content)

with open(r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Removed unused refs")
