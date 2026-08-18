import express, { Application } from 'express';
import helloRoutes from './routes/hello.routes';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import taskRoutes from './routes/task.routes';
import { UPLOADS_DIR } from './middlewares/upload';
import { requestLogger } from './middlewares/requestLogger';

// Create the express application
const app: Application = express();

// Logs every request; registered first so it wraps everything below it.
app.use(requestLogger);

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Serves uploaded files back over HTTP, e.g. a file saved as
// uploads/abc.jpg becomes reachable at GET /uploads/abc.jpg
app.use('/uploads', express.static(UPLOADS_DIR));

// Register the routes
app.use('/', helloRoutes);
app.use('/', authRoutes); // exposes POST /login and POST /refresh-token
app.use('/', uploadRoutes); // exposes POST /upload
app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);

export default app;
