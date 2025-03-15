import { app } from "./app.js";
import { isSubscriptionValidJob } from "./config/cron/index.js";
import { CONFIG } from "./config/env/index.js";

(() => {
  isSubscriptionValidJob();
  app.listen(CONFIG.PORT, () => {
    console.log(`Server running at PORT ${CONFIG.PORT}`);
  });
})();
