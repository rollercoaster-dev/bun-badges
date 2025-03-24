import { Hono } from "hono";
import { AssertionController } from "@/controllers/assertions.controller";

const ASSERTION_ROUTES = {
  CREATE: "/assertions",
  GET: "/assertions/:id",
  LIST: "/assertions",
  REVOKE: "/assertions/:id/revoke",
};

const assertions = new Hono();
const assertionController = new AssertionController();

// List all assertions (with optional filters)
assertions.get(ASSERTION_ROUTES.LIST, (c) =>
  assertionController.listAssertions(c),
);

// Get a specific assertion
assertions.get(ASSERTION_ROUTES.GET, (c) =>
  assertionController.getAssertion(c),
);

// Create (issue) a new badge assertion
assertions.post(ASSERTION_ROUTES.CREATE, (c) =>
  assertionController.createAssertion(c),
);

// Revoke a badge assertion
assertions.post(ASSERTION_ROUTES.REVOKE, (c) =>
  assertionController.revokeAssertion(c),
);

export default assertions;
