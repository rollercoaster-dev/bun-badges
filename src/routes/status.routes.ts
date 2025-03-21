import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "@/db/config";
import { statusLists, badgeAssertions } from "@/db/schema";
import { isValidUuid } from "@/utils/validation";
import {
  isStatusList2021Credential,
  StatusList2021Entry,
} from "@/models/credential.model";
import { CredentialService } from "@/services/credential.service";
import {
  getIndexFromUuid,
  isCredentialRevoked,
} from "@/utils/signing/status-list";

const STATUS_ROUTES = {
  GET_STATUS_LIST: "/list/:issuerId",
  GET_STATUS: "/:assertionId",
};

const status = new Hono();
const credentialService = new CredentialService();

// Get a status list for an issuer
status.get(STATUS_ROUTES.GET_STATUS_LIST, async (c) => {
  try {
    const issuerId = c.req.param("issuerId");

    // Validate UUID format
    if (!issuerId || !isValidUuid(issuerId)) {
      return c.json(
        {
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Status list not found",
          },
        },
        404,
      );
    }

    // Get the status list
    const [statusList] = await db
      .select()
      .from(statusLists)
      .where(eq(statusLists.issuerId, issuerId as string))
      .limit(1);

    if (!statusList) {
      // If no status list exists, create a new one
      const hostUrl = new URL(c.req.url).origin;
      const newStatusList = await credentialService.createOrUpdateStatusList(
        hostUrl,
        issuerId as string,
      );

      // Validate the status list
      if (!isStatusList2021Credential(newStatusList)) {
        throw new Error("Failed to create valid status list");
      }

      return c.json({
        status: "success",
        data: {
          statusList: newStatusList,
        },
      });
    }

    // Parse the status list
    let statusListCredential;
    if (typeof statusList.statusListJson === "string") {
      statusListCredential = JSON.parse(statusList.statusListJson);
    } else {
      statusListCredential = statusList.statusListJson;
    }

    return c.json({
      status: "success",
      data: {
        statusList: statusListCredential,
      },
    });
  } catch (error) {
    console.error("Failed to get status list:", error);
    return c.json(
      {
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve status list",
        },
      },
      500,
    );
  }
});

// Get status for a specific credential
status.get(STATUS_ROUTES.GET_STATUS, async (c) => {
  try {
    const assertionId = c.req.param("assertionId");

    // Validate UUID format
    if (!assertionId || !isValidUuid(assertionId)) {
      return c.json(
        {
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Credential not found",
          },
        },
        404,
      );
    }

    // Get the assertion
    const [assertion] = await db
      .select()
      .from(badgeAssertions)
      .where(eq(badgeAssertions.assertionId, assertionId as string))
      .limit(1);

    if (!assertion) {
      return c.json(
        {
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Credential not found",
          },
        },
        404,
      );
    }

    const issuerId = assertion.issuerId;

    // Get the status list
    const [statusList] = await db
      .select()
      .from(statusLists)
      .where(eq(statusLists.issuerId, issuerId))
      .limit(1);

    // Check status list revocation
    let revoked = assertion.revoked;
    let statusListInfo = null;

    if (statusList) {
      // Parse the status list
      let statusListCredential;
      if (typeof statusList.statusListJson === "string") {
        statusListCredential = JSON.parse(statusList.statusListJson);
      } else {
        statusListCredential = statusList.statusListJson;
      }

      if (isStatusList2021Credential(statusListCredential)) {
        const index = getIndexFromUuid(assertionId as string);
        const encodedList = statusListCredential.credentialSubject.encodedList;

        try {
          const isRevoked = isCredentialRevoked(encodedList, index);

          // Status list takes precedence over database
          revoked = isRevoked;

          // Create a status entry for clients to verify
          const hostUrl = new URL(c.req.url).origin;
          statusListInfo = {
            id: `${hostUrl}/status/${assertionId}`,
            type: "StatusList2021Entry",
            statusPurpose: "revocation",
            statusListIndex: index.toString(),
            statusListCredential: `${hostUrl}/status/list/${issuerId}`,
          } as StatusList2021Entry;
        } catch (error) {
          console.error("Status list verification error:", error);
        }
      }
    }

    return c.json({
      status: "success",
      data: {
        id: assertionId,
        revoked: revoked,
        reason: assertion.revocationReason,
        statusList: statusListInfo,
      },
    });
  } catch (error) {
    console.error("Failed to get credential status:", error);
    return c.json(
      {
        status: "error",
        error: {
          code: "SERVER_ERROR",
          message: "Failed to retrieve credential status",
        },
      },
      500,
    );
  }
});

export default status;
