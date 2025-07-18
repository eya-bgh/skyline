import express from "express" ;
import {login,signup,logout,verifyEmail, forgotPassword, resetPassword,checkAuth,refreshAccessToken} from "../controllers/auth.controller.js"
import { verifyToken } from "../middleware/VerifyToken.js";

const router = express.Router();

router.get("/check-auth", verifyToken, checkAuth);
router.post('/refresh-token', refreshAccessToken);

router.post("/signup",signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password",forgotPassword)
router.post("/reset-password/:token", resetPassword);


export default router;