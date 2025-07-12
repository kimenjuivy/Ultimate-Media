const { createClient } = require('@supabase/supabase-js')
const rateLimit = require('express-rate-limit') // Add this import
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Add the sensitive operations limiter
const sensitiveOperationsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs for sensitive operations
    message: {
        success: false,
        error: 'Too many attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
})

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' })
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        
        if (error || !user) {
            return res.status(403).json({ error: 'Invalid or expired token' })
        }

        req.user = user
        next()
    } catch (error) {
        console.error('Auth error:', error)
        return res.status(403).json({ error: 'Token verification failed' })
    }
}

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', req.user.id)
            .single()

        if (error || !profile || !profile.is_admin) {
            return res.status(403).json({ error: 'Admin access required' })
        }

        next()
    } catch (error) {
        console.error('Admin check error:', error)
        return res.status(500).json({ error: 'Authorization check failed' })
    }
}

// Get user profile
const getUserProfile = async (userId) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (error) throw error
    return data
}

module.exports = {
    authenticateToken,
    requireAdmin,
    getUserProfile,
    sensitiveOperationsLimiter, // Add this to exports
    supabase
}