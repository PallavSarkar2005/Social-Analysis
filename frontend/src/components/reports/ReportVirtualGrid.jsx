/**
 * Grid wrapper that enables CSS content-visibility virtualization for large pages.
 * Pagination already caps page size; this reduces paint cost when limit is high.
 */
export default function ReportVirtualGrid({ children, itemCount = 0 }) {
  const virtualize = itemCount > 48;

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 ${
        virtualize ? "reports-virtual-grid" : ""
      }`}
    >
      {children}
    </div>
  );
}
