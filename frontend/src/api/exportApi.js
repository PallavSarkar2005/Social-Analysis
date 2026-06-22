import client from "./client";

/**
 * Triggers a file download by calling the export endpoints with responseType: 'blob'
 * @param {String} endpointPath - The endpoint path under exports (e.g. 'dashboard', 'competitors', 'reports/:id')
 * @param {String} format - 'pdf' | 'xlsx' | 'csv'
 * @param {String} filename - Output filename
 */
export const triggerDownload = async (endpointPath, format, filename) => {
  const res = await client.get(`/api/exports/${endpointPath}`, {
    params: { format },
    responseType: "blob",
  });
  
  const blob = new Blob([res.data], {
    type:
      format === "pdf"
        ? "application/pdf"
        : format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv",
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
