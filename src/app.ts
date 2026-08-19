import express, { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import helloRoutes from './routes/hello.routes';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import taskRoutes from './routes/task.routes';
import { UPLOADS_DIR } from './middlewares/upload';
import { requestLogger } from './middlewares/requestLogger';
import { swaggerSpec } from './config/swagger';

// Create the express application
const app: Application = express();

// Logs every request; registered first so it wraps everything below it.
app.use(requestLogger);

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Serves uploaded files back over HTTP, e.g. a file saved as
// uploads/abc.jpg becomes reachable at GET /uploads/abc.jpg
app.use('/uploads', express.static(UPLOADS_DIR));

// Interactive API docs — explore and try out every endpoint at /api-docs.
// The raw OpenAPI JSON (useful for importing into Postman, etc.) is
// available at /api-docs.json.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// Register the routes
app.use('/', helloRoutes);
app.use('/', authRoutes); // exposes POST /login and POST /refresh-token
app.use('/', uploadRoutes); // exposes POST /upload
app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);

export default app;
