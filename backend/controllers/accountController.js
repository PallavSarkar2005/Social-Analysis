import Account from "../models/Account.js";

export const createAccount = async (req, res) => {
  try {
    const account = await Account.create(req.body);

    res.status(201).json({
      success: true,
      data: account,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find();

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    await Account.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Account deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};