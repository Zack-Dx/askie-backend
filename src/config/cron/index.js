import cron from "node-cron";
import { prisma } from "../db/index.js";

export const isSubscriptionValidJob = () => {
  cron.schedule("0 0 * * *", async () => {
    const nowUtc = new Date();
    const nowIst = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    console.log(`Subscription Cron Job Started`);
    console.log(`Current UTC Time: ${nowUtc}`);
    console.log(`Current IST Time: ${nowIst}`);
    try {
      const today = new Date();
      const expiredPremiumUsers = await prisma.user.findMany({
        where: {
          isPremium: true,
          premiumEndDate: { lt: today },
        },
      });

      if (expiredPremiumUsers.length === 0) {
        console.log("No expired subscriptions found.");
        return;
      }
      await prisma.user.updateMany({
        where: {
          id: {
            in: expiredPremiumUsers.map((user) => {
              return user.id;
            }),
          },
        },
        data: { isPremium: false, subscriptionPlan: null },
      });
      console.log(
        `Updated ${expiredPremiumUsers.length} users: Subscription expired.`,
      );
    } catch (error) {
      console.error("Error validating subscriptions:", error);
    } finally {
      console.log("Subscription Cron Executed");
    }
  });
};
