import homeRoutes from "./homeRoutes.js";
import apiRoutes from "./apiRoutes.js";

export default function route(app) {
  app.use("/", homeRoutes);
  app.use("/", apiRoutes);
}
