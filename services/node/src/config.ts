export const config = {
  port: parseInt(process.env.VB_NODE_PORT ?? "8200", 10),
  pythonServiceUrl: process.env.VB_PYTHON_URL ?? "http://localhost:8100",
  clientOrigin: process.env.VB_CLIENT_ORIGIN ?? "http://localhost:3000",
} as const;
