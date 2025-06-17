// const express = require('express');
import express from 'express';
import dotenv from "dotenv";
import { connectdb } from './db/connectdb.js';
import authRoutes from "./routes/auth.route.js"
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use("/api/auth", authRoutes)

app.listen(PORT, ()=>{
    connectdb();
    console.log("Server is running on port ",PORT);
})

