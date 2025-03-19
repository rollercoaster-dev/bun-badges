import { config } from "dotenv";
import * as path from "path";

// Load test environment variables
config({ path: path.resolve(process.cwd(), "test.env") });

// Set up any other test setup code here
// Test environment initialization
