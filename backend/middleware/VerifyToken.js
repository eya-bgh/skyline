import jwt from "jsonwebtoken"

export const verifyToken = async (req, res, next) => {
  // Check for token in cookies first, then in Authorization header
  let token = req.cookies.accessToken

  // If no token in cookies, check Authorization header
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7) // Remove 'Bearer ' prefix
    }
  }

  // If still no token, check x-auth-token header (alternative)
  if (!token) {
    token = req.headers["x-auth-token"]
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - no token provided",
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - invalid token",
      })
    }

    // Simple version without database lookup
    req.user = {
      id: decoded.userId,
      // Add other properties from token if available
      ...(decoded.email && { email: decoded.email }),
      ...(decoded.role && { role: decoded.role }),
    }

    next()
  } catch (error) {
    console.log("Error in verifyToken ", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}
