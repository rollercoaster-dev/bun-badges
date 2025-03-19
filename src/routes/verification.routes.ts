import { Hono } from "hono";
import { VerificationController } from "@/controllers/verification.controller";

// Create a new router
const router = new Hono();

// Create controller instance
const verificationController = new VerificationController();

/**
 * @openapi
 * /verify/{assertionId}:
 *   get:
 *     summary: Verify badge assertion by ID
 *     description: Verifies the authenticity of a badge assertion
 *     parameters:
 *       - name: assertionId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the badge assertion to verify
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       description: Whether the assertion is valid
 *                     checks:
 *                       type: object
 *                       properties:
 *                         signature:
 *                           type: boolean
 *                           description: Whether the signature is valid
 *                         revocation:
 *                           type: boolean
 *                           description: Whether the badge is not revoked
 *                         structure:
 *                           type: boolean
 *                           description: Whether the badge structure is valid
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of any validation errors
 */
router.get("/:assertionId", (c) => verificationController.verifyAssertion(c));

/**
 * @openapi
 * /verify:
 *   post:
 *     summary: Verify badge assertion from JSON
 *     description: Verifies the authenticity of a badge assertion provided as JSON
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assertion:
 *                 type: object
 *                 description: The badge assertion JSON to verify
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       description: Whether the assertion is valid
 *                     checks:
 *                       type: object
 *                       properties:
 *                         signature:
 *                           type: boolean
 *                           description: Whether the signature is valid
 *                         revocation:
 *                           type: boolean
 *                           description: Whether the badge is not revoked
 *                         structure:
 *                           type: boolean
 *                           description: Whether the badge structure is valid
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of any validation errors
 */
router.post("/", (c) => verificationController.verifyBadgeJson(c));

export default router;
