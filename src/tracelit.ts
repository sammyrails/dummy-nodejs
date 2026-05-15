import Tracelit from "@tracelit/sdk";

Tracelit.configure((config) => {
  config.apiKey      = process.env.TRACELIT_API_KEY ?? "102f4d0369e3f240836811abe170d2362e03183916597ef46c5bd6302e06f4a4";
  config.serviceName = process.env.TRACELIT_SERVICE_NAME ?? "Node.js Server";
  config.environment = process.env.NODE_ENV ?? "production";
  config.sampleRate  = 1.0;
});

Tracelit.start();
