export default function CompareAccountsTable({
  accounts,
}) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">
        Account Comparison
      </h2>

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">
              Account
            </th>

            <th>Followers</th>

            <th>Avg Views</th>

            <th>Engagement</th>
          </tr>
        </thead>

        <tbody>
          {accounts.map((account) => (
            <tr
              key={account.name}
              className="border-t"
            >
              <td>{account.name}</td>

              <td>
                {account.followers.toLocaleString()}
              </td>

              <td>
                {account.avgViews.toLocaleString()}
              </td>

              <td>
                {account.avgEngagement}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}