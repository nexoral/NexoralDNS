// Global test environment defaults. Individual suites mock modules like
// `@web/utilities/logger` or `mongodb`/`redis`/`amqplib` directly for
// assertions — these env vars are just a safety net so any code path that
// isn't explicitly mocked stays quiet and never touches a real network URI.
// This is what makes the suite safe to run unattended in CI/CD.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.MONGO_URI = 'mongodb://127.0.0.1:1/test-unused';
process.env.REDIS_URI = 'redis://127.0.0.1:1/test-unused';
process.env.RABBITMQ_URI = 'amqp://127.0.0.1:1/test-unused';
