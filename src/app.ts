import express, { Application } from 'express';
import helloRoutes from './routes/hello.routes';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';

// Create the express application
const app: Application = express();

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Register the routes
app.use('/', helloRoutes);
app.use('/', authRoutes); // exposes POST /login and POST /refresh-token
app.use('/users', userRoutes);

export default app;
