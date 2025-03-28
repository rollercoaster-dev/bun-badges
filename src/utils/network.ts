import { createServer } from "net";

/**
 * Checks if a port is available
 * @param port Port number to check
 * @returns Promise that resolves to true if port is available, false otherwise
 */
export const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer()
      .listen(port, () => {
        server.close();
        resolve(true);
      })
      .on("error", () => {
        resolve(false);
      });
  });
};

/**
 * Finds the next available port starting from a given port number
 * @param startPort Port number to start checking from
 * @param maxPort Maximum port number to check (default: 65535)
 * @returns Promise that resolves to the next available port
 * @throws Error if no available port is found
 */
export const findAvailablePort = async (
  startPort: number,
  maxPort: number = 65535,
): Promise<number> => {
  for (let port = startPort; port <= maxPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `No available port found between ${startPort} and ${maxPort}`,
  );
};
