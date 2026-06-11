export default function AccountSelector({
  accounts,
  selectedAccount,
  onChange,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-lg">
          Select Account
        </span>

        <select
          value={selectedAccount}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="border rounded-xl px-4 py-2"
        >
          {accounts.map((account) => (
            <option
              key={account._id}
              value={account._id}
            >
              {account.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}