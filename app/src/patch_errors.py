import re

with open(r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Fix model load error handling
old_model_catch = '''        catch (error) {

            // console.error(error);

            // addIncident("AI Models failed to load");
console.error(err);
        }'''
new_model_catch = '''        catch (error) {
            console.error("Model load error:", error);
            setCameraError("AI Models failed to load. Please refresh.");
            addIncident("AI Models failed to load");
        }'''
content = content.replace(old_model_catch, new_model_catch)

# 2. Add timeout for slow loading models
old_load_models = '''    const loadModels = async () => {

        try {

            console.log("Loading AI Models...");'''
new_load_models = '''    const loadModels = async () => {
        const timeoutId = setTimeout(() => {
            if (!modelsLoaded) {
                setCameraError("Models are loading slowly. Please wait...");
            }
        }, 8000);
        try {
            console.log("Loading AI Models...");'''

content = content.replace(old_load_models, new_load_models)

# Clear the slow loading timeout upon success
old_models_loaded = '''            setModelsLoaded(true);

        }'''
new_models_loaded = '''            clearTimeout(timeoutId);
            setModelsLoaded(true);
            setCameraError(""); // Clear any slow loading warnings
        }'''
content = content.replace(old_models_loaded, new_models_loaded)

# 3. Update addIncident to use reportIncident so it correctly logs to backend
old_add_incident = '''    const addIncident = async (message) => {

        const now = Date.now();

        if (
            lastIncidentRef.current === message &&
            now - lastWarningRef.current < 5000
        ) {
            return;
        }

        lastIncidentRef.current = message;
        lastWarningRef.current = now;

        setIncidentLog(prev => [
            {
                type: "GENERIC_WARNING",
                timestamp: new Date().toLocaleTimeString(),
                message: message,
                severity: "MEDIUM",
                isError: true
            },
            ...prev
        ].slice(0,20));

        try {

            await reportViolation({
                violation: message,
                timestamp: new Date().toISOString()
            });

        } catch (e) {

            console.log(e);

        }

    };'''
new_add_incident = '''    const addIncident = async (message) => {
        reportIncident("SYSTEM_ERROR", message, "MEDIUM", message);
    };'''
# wait, replacing addIncident with reportIncident wrapper is cleaner and avoids code duplication.
content = content.replace(old_add_incident, new_add_incident)


with open(r"c:\Projects\ai-invigilator-app1\app\src\pages\ActiveExam.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Applied error handling patches")
