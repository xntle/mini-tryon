// auth.js - Shop Minis token verification utility
require("dotenv/config");

/**
 * Shop Minis Admin API endpoint for token verification
 * https://shopify.dev/docs/api/shop-minis/minis-admin-api/mutations/usertokenverify
 */
const SHOP_MINIS_ADMIN_API = "https://admin.shop.app/minis/api/graphql";

/**
 * In-memory cache for verified tokens
 * Key: token string
 * Value: { publicId, userState, expiresAt }
 */
const tokenCache = new Map();

/**
 * Verify a Shop Minis user token using the Admin API
 * @param {string} token - The temporary user token from the frontend
 * @returns {Promise<{publicId: string, userState: string, tokenExpiresAt: string}>}
 * @throws {Error} if verification fails
 */
async function verifyUserToken(token) {
  if (!token) {
    throw new Error("No token provided");
  }

  // Check cache first
  const cached = tokenCache.get(token);
  if (cached) {
    const now = new Date();
    const expiresAt = new Date(cached.tokenExpiresAt);

    // Use 5-minute buffer before expiry (as recommended in docs)
    const bufferMs = 5 * 60 * 1000;
    if (expiresAt.getTime() - now.getTime() > bufferMs) {
      console.log("[Auth] Using cached token verification");
      return cached;
    } else {
      console.log("[Auth] Cached token expired, re-verifying");
      tokenCache.delete(token);
    }
  }

  // GraphQL mutation to verify token
  const mutation = `
    mutation VerifyUserToken($token: String!) {
      userTokenVerify(token: $token) {
        publicId
        userState
        tokenExpiresAt
        userErrors {
          code
          message
          field
        }
      }
    }
  `;

  try {
    console.log("[Auth] Calling Shop Minis Admin API to verify token...");
    const response = await fetch(SHOP_MINIS_ADMIN_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: { token },
      }),
    });

    console.log("[Auth] Admin API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Auth] Admin API error response:", errorText);
      throw new Error(`Admin API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("[Auth] Admin API result:", JSON.stringify(result, null, 2));

    // Check for GraphQL errors
    if (result.errors) {
      console.error("[Auth] GraphQL errors:", result.errors);
      throw new Error(`GraphQL error: ${result.errors[0]?.message || "Unknown error"}`);
    }

    const { userTokenVerify } = result.data || {};

    // Check for user errors from the mutation
    if (userTokenVerify?.userErrors && userTokenVerify.userErrors.length > 0) {
      const error = userTokenVerify.userErrors[0];
      console.error("[Auth] Token verification failed:", error);

      // Handle specific error codes
      switch (error.code) {
        case "TOKEN_EXPIRED":
          throw new Error("Token has expired");
        case "TOKEN_INVALID":
          throw new Error("Token is invalid");
        case "INVALID_MINI":
          throw new Error("Invalid Mini configuration");
        case "USER_NOT_FOUND":
          throw new Error("User not found");
        default:
          throw new Error(error.message || "Token verification failed");
      }
    }

    const { publicId, userState, tokenExpiresAt } = userTokenVerify || {};

    if (!publicId) {
      throw new Error("No publicId returned from verification");
    }

    // Cache the result
    const verifiedData = { publicId, userState, tokenExpiresAt };
    tokenCache.set(token, verifiedData);

    console.log("[Auth] Token verified successfully:", { publicId, userState });
    return verifiedData;
  } catch (error) {
    console.error("[Auth] Token verification error:", error.message);
    console.error("[Auth] Full error:", error);
    throw error;
  }
}

/**
 * Express middleware to authenticate Shop Minis requests
 * Extracts the Bearer token from Authorization header and verifies it
 * Attaches user info to req.shopUser
 */
async function authenticateShopUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Missing authorization header",
        code: "NO_AUTH_HEADER",
      });
    }

    // Extract token from "Bearer <token>" format
    const match = authHeader.match(/^Bearer (.+)$/i);
    if (!match) {
      return res.status(401).json({
        error: "Invalid authorization format. Expected: Bearer <token>",
        code: "INVALID_AUTH_FORMAT",
      });
    }

    const token = match[1];

    try {
      const userInfo = await verifyUserToken(token);

      // Attach user info to request for use in route handlers
      req.shopUser = {
        publicId: userInfo.publicId,
        userState: userInfo.userState,
        tokenExpiresAt: userInfo.tokenExpiresAt,
      };

      // Also set the user state header if available from frontend
      const userStateHeader = req.headers["x-user-state"];
      if (userStateHeader) {
        req.shopUser.userStateFromHeader = userStateHeader;
      }

      next();
    } catch (verifyError) {
      console.error("[Auth] Verification failed:", verifyError.message);
      return res.status(401).json({
        error: verifyError.message,
        code: "TOKEN_VERIFICATION_FAILED",
      });
    }
  } catch (error) {
    console.error("[Auth] Authentication middleware error:", error);
    return res.status(500).json({
      error: "Internal authentication error",
      code: "AUTH_ERROR",
    });
  }
}

/**
 * Clear the token cache (useful for testing or periodic cleanup)
 */
function clearTokenCache() {
  const size = tokenCache.size;
  tokenCache.clear();
  console.log(`[Auth] Cleared ${size} cached tokens`);
}

module.exports = {
  verifyUserToken,
  authenticateShopUser,
  clearTokenCache,
};
