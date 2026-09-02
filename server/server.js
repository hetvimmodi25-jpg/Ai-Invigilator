const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const examRoutes = require("./routes/examRoutes");
const resultRoutes = require("./routes/resultRoutes");
const proctorRoutes = require("./routes/proctorRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));


// Student APIs
app.use("/api/auth", authRoutes);


// Admin APIs
app.use("/api/admin", adminRoutes);

    
// Exam APIs
app.use("/api/exam", examRoutes);

// Result APIs
app.use("/api/result", resultRoutes);

// Proctor APIs
app.use("/api/proctor", proctorRoutes);

app.get("/", (req,res)=>{
    res.send("AI Invigilator Backend Running Successfully");
});


app.get("/test-db", async(req,res)=>{
    try{

        const result = await pool.query("SELECT NOW()");

        res.json({
            success:true,
            message:"Database Connected Successfully",
            time:result.rows[0]
        });

    }catch(error){

        console.log(error);

        res.status(500).json({
            success:false,
            message:"Database Connection Failed"
        });
    }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});