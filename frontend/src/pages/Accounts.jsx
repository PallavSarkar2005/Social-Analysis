import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

import {
  getAccounts,
  createAccount,
  deleteAccount,
} from "../api/accountApi";

export default function Accounts() {
  const [accounts, setAccounts] =
    useState([]);

  const [form, setForm] =
    useState({
      name: "",
      platform: "youtube",
      accountId: "",
      profileUrl: "",
    });

  const loadAccounts =
    async () => {
      const res =
        await getAccounts();

      setAccounts(res.data);
    };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      await createAccount(form);

      setForm({
        name: "",
        platform:
          "youtube",
        accountId: "",
        profileUrl: "",
      });

      loadAccounts();
    };

  const handleDelete =
    async (id) => {
      await deleteAccount(id);

      loadAccounts();
    };

  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 bg-gray-100 min-h-screen">
        <Navbar />

        <div className="p-6">

          <div className="bg-white p-5 rounded-xl shadow mb-6">
            <h2 className="text-xl font-bold mb-4">
              Add Account
            </h2>

            <form
              onSubmit={
                handleSubmit
              }
              className="grid grid-cols-2 gap-4"
            >
              <input
                placeholder="Name"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="border p-2 rounded"
              />

              <input
                placeholder="Channel ID"
                value={
                  form.accountId
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    accountId:
                      e.target.value,
                  })
                }
                className="border p-2 rounded"
              />

              <input
                placeholder="Profile URL"
                value={
                  form.profileUrl
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    profileUrl:
                      e.target.value,
                  })
                }
                className="border p-2 rounded"
              />

              <button
                className="bg-black text-white rounded p-2"
              >
                Add Account
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-4">
              Accounts
            </h2>

            <table className="w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Platform</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {accounts.map(
                  (account) => (
                    <tr
                      key={
                        account._id
                      }
                    >
                      <td>
                        {
                          account.name
                        }
                      </td>

                      <td>
                        {
                          account.platform
                        }
                      </td>

                      <td>
                        <button
                          onClick={() =>
                            handleDelete(
                              account._id
                            )
                          }
                          className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}