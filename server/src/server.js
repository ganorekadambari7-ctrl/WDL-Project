import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import insightRoutes from './routes/insightRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';

const app = express();
const allowedOrigins = [process.env.CLIENT_URL || 'http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error('CORS origin not allowed'));
}}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
// Direct paths are kept for clients that use the requested /login and /register contract.
app.use('/', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/leave', leaveRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/salary', salaryRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/promotions', promotionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/courses', courseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/departments', departmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/settings', settingsRoutes);
app.use('/api/insights', insightRoutes);
app.use('/insights', insightRoutes);
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const port = process.env.PORT || 5000;
connectDatabase().then(() => app.listen(port, () => console.log(`API listening on port ${port}`)));
