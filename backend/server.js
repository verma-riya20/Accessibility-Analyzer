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

// Middleware
app.use(cors(
  { origin: 'http://localhost:5173' }
));
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
