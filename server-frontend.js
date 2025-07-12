const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to all requests
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://xljojazexigswzfojnqh.supabase.co',
    'https://your-app-name.onrender.com'  // Add this after deployment
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
}));

// Helmet configuration with CSP bypass for Font Awesome and other resources
// Helmet configuration with proper CSP for inline handlers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
        "https://maxcdn.bootstrapcdn.com",
        "https://use.fontawesome.com",
        "https://stackpath.bootstrapcdn.com"
      ],
scriptSrc: [
  "'self'", 
  "'unsafe-inline'",
  "'unsafe-eval'",
  "https://cdnjs.cloudflare.com",
  "https://cdn.jsdelivr.net",
  "https://code.jquery.com",
  "https://maxcdn.bootstrapcdn.com",
  "https://use.fontawesome.com",
  "https://stackpath.bootstrapcdn.com",
  "https://cdn.tailwindcss.com"  // Add this line
],
      scriptSrcAttr: ["'unsafe-inline'"], // This fixes your inline event handler error
      fontSrc: [
        "'self'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.gstatic.com",
        "https://use.fontawesome.com",
        "https://stackpath.bootstrapcdn.com",
        "data:"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://xljojazexigswzfojnqh.supabase.co",
        "wss://xljojazexigswzfojnqh.supabase.co"
      ],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Import routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const invoiceRoutes = require('./routes/invoice');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/invoices', invoiceRoutes);

// Serve main pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

// Handle client routes
app.get('/client/:clientId', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/clients/client-dashboard.html'));
});

// Serve invoice pages
app.get('/invoice/:invoiceId', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/invoices/invoice-view.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ultimate Media Frontend Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
  console.log(`🔒 CSP configured to allow Font Awesome and CDN resources`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;