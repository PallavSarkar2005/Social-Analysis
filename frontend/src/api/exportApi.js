import client from "./client";

const MIME = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  json: "application/json",
  markdown: "text/markdown",
  md: "text/markdown",
};

async function readBlobErrorMessage(error) {
  const data = error?.response?.data;
  if (!data) return error?.response?.data?.message || error.message || "Export failed";

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return parsed.message || data;
    } catch {
      return data;
    }
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed.message || text || "Export failed";
    } catch {
      return "Export failed";
    }
  }

  if (typeof data === "object" && data.message) return data.message;
  return error.message || "Export failed";
}

/**
 * Triggers a file download by calling the export endpoints with responseType: 'blob'
 * @param {String} endpointPath - e.g. 'reports/:id'
 * @param {String} format - pdf | xlsx | csv | json | markdown
 * @param {String} filename - Output filename without extension
 */
export const triggerDownload = async (endpointPath, format, filename) => {
  const normalized = format === "md" ? "markdown" : format;
  const requestFormat = normalized === "markdown" ? "markdown" : format;

  let res;
  try {
    res = await client.get(`/api/exports/${endpointPath}`, {
      params: { format: requestFormat },
      responseType: "blob",
      timeout: 120000,
    });
  } catch (error) {
    const message = await readBlobErrorMessage(error);
    const err = new Error(message);
    err.status = error?.response?.status;
    err.cause = error;
    throw err;
  }

  const contentType = String(res.headers?.["content-type"] || "");
  // Backend sometimes returns JSON errors with 200 misconfigured — or axios may
  // deliver error JSON as a blob when Content-Type is application/json.
  if (
    requestFormat !== "json" &&
    contentType.includes("application/json")
  ) {
    try {
      const text = await res.data.text();
      const parsed = JSON.parse(text);
      throw new Error(parsed.message || "Export failed");
    } catch (e) {
      if (e.message && e.message !== "Export failed" && !e.message.includes("JSON")) {
        throw e;
      }
      throw new Error("Export failed: unexpected JSON response", { cause: e });
    }
  }

  const ext = normalized === "markdown" ? "md" : format;
  const blob = new Blob([res.data], {
    type: MIME[normalized] || MIME[format] || "application/octet-stream",
  });

  if (blob.size === 0) {
    throw new Error("Export returned an empty file");
  }

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename || "intelligence_report"}.${ext}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { size: blob.size, format: normalized };
};
