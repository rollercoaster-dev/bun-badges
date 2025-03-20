import { Hono } from "hono";
import { VerificationController } from "@/controllers/verification.controller";

const VERIFICATION_ROUTES = {
  VERIFY_ASSERTION: "/assertions/:assertionId",
  VERIFY_BADGE_JSON: "/verify-json",
  VERIFY_STATUS_LIST: "/status/:statusListId",
};

const verification = new Hono();
const verificationController = new VerificationController();

// Verify an assertion by ID
verification.get(VERIFICATION_ROUTES.VERIFY_ASSERTION, (c) =>
  verificationController.verifyAssertion(c),
);

// Verify a badge by parsing the provided JSON
verification.post(VERIFICATION_ROUTES.VERIFY_BADGE_JSON, (c) =>
  verificationController.verifyBadgeJson(c),
);

// Verify a status list credential
verification.get(VERIFICATION_ROUTES.VERIFY_STATUS_LIST, (c) =>
  verificationController.verifyStatusList(c),
);

export default verification;
