import dotenv from 'dotenv';
import app from './app';

// Load variables from the .env file into process.env
dotenv.config();

// Use the PORT from .env, otherwise default to 3000
const PORT = process.env.PORT || 3000;

// Start the server and listen for requests
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
