export const extractIpAddress = (req) => {
  const ipAddressRaw =
    req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "0.0.0.0";
  return Array.isArray(ipAddressRaw)
    ? ipAddressRaw[0]
    : ipAddressRaw.split(",")[0].trim();
};

export const parseUserAgent = (userAgentString) => {
  if (!userAgentString) {
    return { browser: "Unknown", os: "Unknown", device: "Desktop" };
  }

  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";
  const ua = userAgentString.toLowerCase();

  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("chrome") || ua.includes("chromium")) browser = "Chrome";
  else if (
    ua.includes("safari") &&
    !ua.includes("chrome") &&
    !ua.includes("chromium")
  )
    browser = "Safari";
  else if (ua.includes("edge") || ua.includes("edg")) browser = "Edge";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";

  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone"))
    device = "Mobile";
  else if (ua.includes("ipad") || ua.includes("tablet")) device = "Tablet";

  return { browser, os, device };
};

export const getRequestMeta = (req) => {
  const ipAddress = extractIpAddress(req);
  const userAgent = req.headers["user-agent"] || "";
  return { ipAddress, userAgent, ...parseUserAgent(userAgent) };
};
