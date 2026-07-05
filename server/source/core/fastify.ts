/* eslint-disable @typescript-eslint/no-unused-vars */
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyCookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { CORS_CONFIG, ServerKeys } from "./key";
import mainRouter from "../Router/Router";
import container from "../container/appContainer";
import { MongoConnectionManager } from "../Database/MongoConnectionManager";
import { MongoCollectionManager } from "../Database/MongoCollectionManager";
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import startCronJob from "../CronJob/CronJob";
import { initializeAdultContentDomainGroup } from "../utilities/InitializeAdultContentGroup.utls";
import { initializeAdBlockingDomainGroup } from "../utilities/InitializeAdBlockingGroup.utls";
import { initializeAIContentDomainGroup } from "../utilities/InitializeAIContentGroup.utls";


export default function FastifyServer() {

  const NexoralServer = Fastify({
    logger: false, // Disable default logging
    trustProxy: true, // Trust the reverse proxy headers
    bodyLimit: 52428800, // Set body limit to 50MB
  });

  // Attach Middlewares
  NexoralServer.register(fastifyCors, {
    origin: CORS_CONFIG.ORIGIN,
    methods: CORS_CONFIG.METHODS,
    allowedHeaders: CORS_CONFIG.ALLOWED_HEADERS,
    credentials: CORS_CONFIG.ALLOW_CREDENTIALS,
    exposedHeaders: CORS_CONFIG.EXPOSED_HEADERS,
    maxAge: CORS_CONFIG.MAX_AGE,
  });

  // Cookie support (must register before routes)
  NexoralServer.register(fastifyCookie);

  // Global rate limiting: 100 requests per minute per IP
  NexoralServer.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
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



  // ====== Swagger setup ======
  NexoralServer.register(swagger, {
    swagger: {
      info: {
        title: 'NexoralDNS API',
        description: 'Full API documentation for NexoralDNS Server',
        version: '1.0.1',
      },
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });

  NexoralServer.register(swaggerUI, {
    routePrefix: '/docs', // Swagger UI will be available at /docs
    uiConfig: { docExpansion: 'full' },
    staticCSP: true,
  });



  // Register the main router with /api prefix
  NexoralServer.register(mainRouter, {
    prefix: "/api",
  });


  // Initialize MongoDB via DI container
  const mongoConnManager = container.get<MongoConnectionManager>('MongoConnectionManager');
  const mongoCollManager = container.get<MongoCollectionManager>('MongoCollectionManager');

  Promise.all([
    mongoConnManager.connect(),
    mongoCollManager.initialize(),
  ])
    .then(async () => {
      try {
        // Start Cron Jobs
        if (process.argv[1] === __filename) startCronJob();

        // Initialize adult content domain group (anti-porn mode)
        await initializeAdultContentDomainGroup();

        // Initialize ad blocking domain group (anti-ads mode)
        await initializeAdBlockingDomainGroup();

        // Initialize AI content domain group (anti-ai mode)
        await initializeAIContentDomainGroup();

        NexoralServer.listen({
          port: Number(ServerKeys.PORT),
          host: String(ServerKeys.HOST),
        });
        console.log(
          `Nexoral Server is running on http://localhost:${ServerKeys.PORT}`,
        );
      } catch (err) {
        NexoralServer.log.error(err);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

// Run the server if this file is executed directly
if (process.argv[1] === __filename) {
  FastifyServer();
};;