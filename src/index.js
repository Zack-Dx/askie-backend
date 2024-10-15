import { app } from "./app.js";
import { CONFIG } from "./config/env/index.js";

(() => {
  app.listen(CONFIG.PORT, () => {
    console.log(`Server running at PORT ${CONFIG.PORT}`);
  });
})();
