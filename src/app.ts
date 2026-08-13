import express, { Application } from 'express';
import helloRoutes from './routes/hello.routes';

// Create the express application
const app: Application = express();

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Register the routes
app.use('/', helloRoutes);

export default app;
