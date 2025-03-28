import { findAvailablePort } from "../src/utils/network";
import { $ } from "bun";

// Base ports, potentially overridden by environment variables
const baseServerPort = parseInt(process.env.PORT || "7777", 10);
const baseDbPort = parseInt(process.env.DB_PORT || "5432", 10);

async function startDevEnvironment() {
  try {
    console.log(
      `Searching for available server port starting from ${baseServerPort}...`,
    );
    const serverPort = await findAvailablePort(baseServerPort);
    console.log(`Found available server port: ${serverPort}`);

    console.log(
      `Searching for available database port starting from ${baseDbPort}...`,
    );
    const dbPort = await findAvailablePort(baseDbPort);
    console.log(`Found available database port: ${dbPort}`);

    console.log(
      `\nAttempting to start docker-compose with server port ${serverPort} and database port ${dbPort}...\n`,
    );

    // Execute docker-compose. Bun's $ inherits stdio by default.
    // If the command fails, it will throw an error caught by the catch block.
    await $`docker-compose -f docker-compose.dev.yml up`.env({
      ...process.env, // Inherit existing environment variables
      PORT: serverPort.toString(),
      DB_PORT: dbPort.toString(),
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error during startup: ${error.message}`);
    } else {
      console.error("An unknown error occurred during startup:", error);
    }
    process.exit(1);
  }
}

startDevEnvironment();
