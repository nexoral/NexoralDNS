/* eslint-disable @typescript-eslint/no-unused-vars */
import Fastify from "fastify";
import fastifyCors from "@fastify/cors";


const app = Fastify({
  logger: true,
});

app.register(fastifyCors, {
  origin: "*",
});

app.get("/", async (request, reply) => {
  return { hello: "world" };
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
