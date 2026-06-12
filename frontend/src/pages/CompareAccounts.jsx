import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

import { getCompareAccounts } from "../api/analyticsApi";

import CompareChart from "../components/charts/CompareChart";

export default function CompareAccounts() {
  const [accounts, setAccounts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response =
          await getCompareAccounts();

        setAccounts(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 bg-gray-100 min-h-screen">
        <Navbar />

        <div className="p-6 space-y-6">

          <CompareChart
            data={accounts}
            title="Followers Comparison"
            dataKey="followers"
          />

          <CompareChart
            data={accounts}
            title="Average Views"
            dataKey="avgViews"
          />

          <CompareChart
            data={accounts}
            title="Engagement Rate"
            dataKey="avgEngagement"
          />

        </div>
      </div>
    </div>
  );
}