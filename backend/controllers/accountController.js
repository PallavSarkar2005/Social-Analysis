import Account from "../models/Account.js";

export const createAccount = async (req, res, next) => {
  try {
    const { name, platform, accountId, profileUrl, state, party } = req.body;

    // Check if account already tracked by this user
    const existing = await Account.findOne({ accountId, userId: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You are already tracking this account",
      });
    }

    const account = await Account.create({
      name,
      platform,
      accountId,
      profileUrl,
      userId: req.user._id,
      state: state || "Unknown State",
      party: party || "Independent",
    });

    res.status(201).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

export const getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find({ userId: req.user._id, isCompetitor: { $ne: true } });

    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;

    const account = await Account.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or not authorized to delete",
      });
    }

    res.json({
      success: true,
      message: "Account deleted",
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccountGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { group } = req.body;

    if (!group) {
      return res.status(400).json({
        success: false,
        message: "Group value is required",
      });
    }

    const account = await Account.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: { group } },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or not authorized to update group",
      });
    }

    res.status(200).json({
      success: true,
      message: "Group updated successfully",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccountPartyState = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { party, state } = req.body;

    const updates = {};
    if (party !== undefined) updates.party = party;
    if (state !== undefined) updates.state = state;

    const account = await Account.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: updates },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found or not authorized to update",
      });
    }

    res.status(200).json({
      success: true,
      message: "Account details updated successfully",
      data: account,
    });
  } catch (error) {
    next(error);
  }
};