// Enhanced CI environment detection
// Add these imports at the top
import { resolve } from "path";
import { config } from "dotenv";
// Other imports...

// Determine if we're running in CI environment
const isCI = process.env.CI === "true";
console.log(`🔄 Environment: ${isCI ? "CI" : "local"}`);

// Load appropriate environment variables based on environment
if (isCI) {
  console.log("Using CI environment configuration");
  // CI environment variables are already set in the workflow
} else {
  console.log("Loading test environment variables from .env.test");
  config({ path: resolve(process.cwd(), ".env.test") });
}

// Ensure DATABASE_URL is available and log connection info
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(
  `Database URL: ${process.env.DATABASE_URL?.replace(/:.+@/, ":****@") || "Not set"}`,
);

// Improved Docker detection and connection strategy
const useDocker = !isCI && !process.env.SKIP_DOCKER;
console.log(`🐳 Docker for tests: ${useDocker ? "enabled" : "disabled"}`);

// Only setup Docker database for local environment
// In CI, we use the service container provided by GitHub Actions
if (needsDatabase) {
  if (useDocker) {
    console.log("🐳 Setting up Docker test database...");
    // Use the executeDockerComposeCommand function here
    // ...
  } else {
    console.log(
      "🔄 Using existing database connection (CI or direct connection)",
    );

    // Improved database connection with better retry logic
    async function connectToDatabase(retries = 5, delay = 1000) {
      console.log(
        `Attempting to connect to database at ${process.env.DATABASE_URL?.replace(/:.+@/, ":****@")}`,
      );

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          // Use your database connection code here
          const client = await dbPool.connect();
          try {
            await client.query("SELECT 1");
            console.log("✅ Database connection successful");
            return true;
          } finally {
            client.release();
          }
        } catch (err) {
          console.error(
            `❌ Database connection attempt ${attempt}/${retries} failed:`,
            err,
          );

          if (attempt < retries) {
            console.log(`Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            // Increase delay for next attempt (exponential backoff)
            delay = Math.min(delay * 1.5, 10000);
          } else {
            console.error("❌ All database connection attempts failed");
            // In CI, we should fail the test if DB connection fails
            if (isCI) {
              throw new Error("Database connection failed in CI environment");
            } else {
              console.warn("Continuing with tests that don't require database");
              return false;
            }
          }
        }
      }

      return false;
    }

    // Run the connection attempt
    await connectToDatabase();

    // CI specific database setup
    if (isCI) {
      console.log("🔄 Running migrations in CI environment...");
      try {
        // Run any additional CI specific setup here
        // ...

        console.log("✅ CI database setup complete");
      } catch (error) {
        console.error("❌ Failed to set up CI database:", error);
        throw error; // Fail the test in CI if setup fails
      }
    }
  }
}

// Add better cleanup handling
// This ensures database connections are properly closed at the end of tests
let cleanupDone = false;

function cleanup() {
  if (cleanupDone) return;
  cleanupDone = true;

  console.log("🧹 Cleaning up test environment...");

  if (useDocker) {
    try {
      executeDockerComposeCommand("down", { stdio: "inherit" });
      console.log("✅ Docker containers stopped");
    } catch (error) {
      console.warn("⚠️ Failed to stop Docker containers:", error);
    }
  }

  if (poolEnd) {
    try {
      poolEnd();
      console.log("✅ Database connections closed");
    } catch (error) {
      console.warn("⚠️ Failed to close database connections:", error);
    }
  }

  console.log("✅ Cleanup completed");
}

// Register cleanup handlers
process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(1);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(1);
});
