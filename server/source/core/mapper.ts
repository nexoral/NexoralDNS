/* eslint-disable @typescript-eslint/no-unused-vars */
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { CORS_CONFIG, ServerKeys } from "./key";
import checkPortAndDocker from "./PostFreeChecker";

const NexoralServer = Fastify({
  logger: false, // Disable default logging
  trustProxy: true, // Trust the reverse proxy headers
  bodyLimit: 52428800, // Set body limit to 50MB
});

// Attach Middlewares
NexoralServer.register(fastifyCors, {
  origin: CORS_CONFIG.ORIGIN, // Allow all origins
  methods: CORS_CONFIG.METHODS, // Allow specific methods
  allowedHeaders: CORS_CONFIG.ALLOWED_HEADERS, // Allow specific headers
  credentials: CORS_CONFIG.ALLOW_CREDENTIALS, // Allow credentials
  exposedHeaders: CORS_CONFIG.EXPOSED_HEADERS, // Expose specific headers
  maxAge: CORS_CONFIG.MAX_AGE, // Cache preflight response for 24 hours
});

// Configure JSON parsing
NexoralServer.addContentTypeParser(
  "application/json",
  { parseAs: "string", bodyLimit: 52428800 },
  (req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  },
);

// Register the main router with /api prefix
// NexoralServer.register(router, {
//   prefix: "/api",
// });
  

checkPortAndDocker(ServerKeys.PORT).then(() => {
  console.log(`Port ${ServerKeys.PORT} is available.`);
  try {
    NexoralServer.listen({
      port: Number(ServerKeys.PORT),
      host: "0.0.0.0",
    });
    console.log(
      `Nexoral Server is running on http://localhost:${ServerKeys.PORT}`,
    );
  } catch (err) {
    NexoralServer.log.error(err);
    process.exit(1);
  }
}).catch((err) => {
  console.error(err);
  process.exit(1);
});