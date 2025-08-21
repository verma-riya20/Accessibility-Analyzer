const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const analysisRoutes = require('./routes/analysis');
const healthRoutes = require('./routes/health');
const path = require('path');

// Load environment variables FIRST, before anything else
dotenv.config({ path: path.join(__dirname, '.env') });

// Debug: Check if environment variables are loaded
console.log('🔧 Environment Setup:');
console.log('PORT:', process.env.PORT || 'Not set (using 3001)');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('HUGGINGFACE_API_KEY:', process.env.HUGGINGFACE_API_KEY ? 'Loaded ✅' : 'Missing ❌');



const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Remove trailing slash for comparison
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://accessibility-analyzer-eight.vercel.app',
      'https://accessibility-analyzer-eight.vercel.app/', // with slash
      normalizedOrigin, // normalized version
    ];
        // Check if origin or its normalized version is allowed
    if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
      console.log('✅ CORS allowed for origin:', origin);
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
   optionsSuccessStatus: 200, // For legacy browser support
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400 // 24 hours
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Middleware
//app.use(cors(
//  { origin: 'https://accessibility-analyzer-eight.vercel.app/' }
//));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/analysis', analysisRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Accessibility Analyzer API running on port ${PORT}`);
});

module.exports = app;
