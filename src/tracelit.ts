import Tracelit from "@tracelit/sdk";

Tracelit.configure((config) => {
  config.apiKey      = process.env.TRACELIT_API_KEY ?? "";
  config.serviceName = process.env.TRACELIT_SERVICE_NAME ?? "Node.js Server";
  config.environment = process.env.NODE_ENV ?? "production";
});

Tracelit.start();
