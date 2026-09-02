import re

with open(r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove mock import
content = content.replace('import { pickRandomEvent } from "../utils/mockMonitoring.js";\n', '')

# Remove activeWarning default
content = content.replace('''  const [activeWarning, setActiveWarning] =
    useState(() => pickRandomEvent());''', '''  const [activeWarning, setActiveWarning] = useState(null);''')

# Update reportIncident to trigger the warning popup
old_report = '''const reportIncident = async (type, text, severity, description) => {

    const now = Date.now();'''
new_report = '''const reportIncident = async (type, text, severity, description) => {

    const now = Date.now();

    // Trigger UI warning for medium/high incidents
    if (severity === "HIGH" || severity === "MEDIUM") {
        setActiveWarning({ title: type, message: text || description });
        setIsWarningDismissed(false);
        setIsWarningHidden(false);
    }'''
content = content.replace(old_report, new_report)

# Find if there are any other mock calls
with open(r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Removed mock data and integrated warning popup with AI")
