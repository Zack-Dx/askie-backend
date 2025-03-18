import { formatApiResponse } from "../utils/helper.js";

export const checkUserPremium = (req, res, next) => {
  const user = req.user;
  if (user.isPremium) {
    return next();
  }

  return res
    .status(400)
    .json(formatApiResponse(400, false, null, "Premium Access Only"));
};
