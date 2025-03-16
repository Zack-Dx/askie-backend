import { server } from "./app.js";
import { isSubscriptionValidJob } from "./config/cron/index.js";
import { CONFIG } from "./config/env/index.js";

(() => {
  isSubscriptionValidJob();
  server.listen(CONFIG.PORT, () => {
    console.log(`Server running at PORT ${CONFIG.PORT}`);
  });
})();
