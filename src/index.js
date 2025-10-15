import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Import app function AFTER environment variables are loaded
import runImportCycle from './app/index.js';

// Run the application
runImportCycle();
