import axios from "axios";

const BASE_URL = "http://localhost:5000";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING SOCIAL IQ AUTHENTICATION TESTS...");
  console.log("==================================================");

  let csrfToken = "";
  let cookieHeader = "";
  const cookiesMap = {};

  const updateTokens = (headers) => {
    const setCookie = headers["set-cookie"];
    if (setCookie) {
      setCookie.forEach(cookieStr => {
        const parts = cookieStr.split(";")[0].split("=");
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const val = parts[1].trim();
          cookiesMap[name] = val;
          if (name === "XSRF-TOKEN") {
            csrfToken = val;
          }
        }
      });
      cookieHeader = Object.entries(cookiesMap).map(([name, val]) => `${name}=${val}`).join("; ");
    }
  };

  // Initialize CSRF session
  console.log("Initializing CSRF session...");
  try {
    const initRes = await axios.get(`${BASE_URL}/api/auth/me`);
    updateTokens(initRes.headers);
  } catch (err) {
    if (err.response) {
      updateTokens(err.response.headers);
    }
  }
  
  console.log("CSRF Token initialized:", csrfToken);

  const testEmail = `test-${Date.now()}@socialiq.com`;
  const testPassword = "K9#zL1&qP!vM8";
  const testName = "Test User";
  let token = "";

  const getHeaders = (authToken = "") => {
    const headers = {
      "x-xsrf-token": csrfToken,
    };
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    return headers;
  };

  // 1. Test Registration
  try {
    console.log(`\n[Test 1] Registering user: ${testEmail}...`);
    const registerRes = await axios.post(
      `${BASE_URL}/api/auth/register`,
      {
        name: testName,
        email: testEmail,
        password: testPassword,
      },
      { headers: getHeaders() }
    );

    console.log("Status Code:", registerRes.status);
    console.log("Response Data:", JSON.stringify(registerRes.data));

    if (registerRes.data.success && registerRes.data.data) {
      console.log("✓ Registration successful!");
      updateTokens(registerRes.headers);
      token = registerRes.data.data.token;
    } else {
      console.error("✗ Registration failed");
    }
  } catch (error) {
    console.error("✗ Registration failed with error:", error.response?.data || error.message);
  }

  // 2. Test Fetching authenticated user (State Sync & Bypass Verification Checks)
  try {
    console.log("\n[Test 2] Accessing /api/auth/me...");
    const meRes = await axios.get(`${BASE_URL}/api/auth/me`, { headers: getHeaders(token) });
    console.log("Status Code:", meRes.status);
    console.log("User details:", JSON.stringify(meRes.data.data));
    if (meRes.data.success && meRes.data.data.isEmailVerified === true) {
      console.log("✓ /me endpoint returned verified user successfully (isEmailVerified = true)!");
    } else {
      console.error("✗ User is not marked as verified or /me failed");
    }
  } catch (error) {
    console.error("✗ /me request failed:", error.response?.data || error.message);
  }

  // 3. Test Deprecated Verification Route 404
  try {
    console.log("\n[Test 3] Calling deprecated POST /api/auth/verify-email...");
    const res = await axios.post(`${BASE_URL}/api/auth/verify-email`, { token: "dummy" }, { headers: getHeaders(token) });
    console.error("✗ Deprecated route verify-email did not return 404! Status:", res.status);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log("✓ Deprecated /verify-email returned 404 successfully!");
    } else {
      console.error("✗ Unexpected response for /verify-email:", error.response?.status || error.message, error.response?.data);
    }
  }

  try {
    console.log("\n[Test 4] Calling deprecated POST /api/auth/resend-verification...");
    const res = await axios.post(`${BASE_URL}/api/auth/resend-verification`, { email: testEmail }, { headers: getHeaders(token) });
    console.error("✗ Deprecated route resend-verification did not return 404! Status:", res.status);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log("✓ Deprecated /resend-verification returned 404 successfully!");
    } else {
      console.error("✗ Unexpected response for /resend-verification:", error.response?.status || error.message, error.response?.data);
    }
  }

  // 4. Test Optional Media Upload
  try {
    console.log("\n[Test 5] Calling POST /api/media/upload with no file...");
    const res = await axios.post(`${BASE_URL}/api/media/upload`, {}, { headers: getHeaders(token) });
    console.error("✗ Media upload accepted request without file! Status:", res.status);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log("✓ Media upload correctly rejected request with 400 (No image file provided)!");
    } else {
      console.error("✗ Unexpected response for media upload:", error.response?.status || error.message, error.response?.data);
    }
  }

  console.log("\n==================================================");
  console.log("AUTHENTICATION REFACTOR VERIFICATION COMPLETED!");
  console.log("==================================================");
}

runTests();
