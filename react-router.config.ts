import type { Config } from "@react-router/dev/config";
import { flatRoutes } from "@react-router/fs-routes";

export default {
  ssr: true,
  routes: () => flatRoutes(),
} satisfies Config;
