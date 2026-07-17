import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import docRoutes from './routes/docs.js';
import versionRoutes from './routes/versions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend client port 3000
app.use(cors({
  origin: '*', // Allow all origins for local ease-of-use
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api/docs', docRoutes);
app.use('/api/versions', versionRoutes);

// Health Check API Root
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Corporate Documentation API is running',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error: ' + err.message });
});

app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`  Backend Server is running on port ${PORT}`);
  console.log(`  API Access: http://localhost:${PORT}`);
  console.log(`=============================================`);
});
