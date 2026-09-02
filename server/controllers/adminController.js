const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


exports.adminLogin = async(req,res)=>{

    try{

        const {email,password}=req.body;


        const admin = await pool.query(
            "SELECT * FROM admins WHERE email=$1",
            [email]
        );


        if(admin.rows.length===0){

            return res.status(400).json({
                success:false,
                message:"Admin not found"
            });

        }


        const validPassword = await bcrypt.compare(
            password,
            admin.rows[0].password
        );


        if(!validPassword){

            return res.status(400).json({
                success:false,
                message:"Invalid password"
            });

        }


        const token = jwt.sign(
            {
                admin_id:admin.rows[0].admin_id,
                email:admin.rows[0].email
            },
            process.env.JWT_SECRET,
            {
                expiresIn:"24h"
            }
        );


        res.json({

            success:true,
            token,
            admin:admin.rows[0]

        });


    }catch(err){

        console.log(err);

        res.status(500).json({

            success:false,
            message:"Server Error"

        });

    }

};