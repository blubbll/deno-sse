import { serve, ServerRequest } from "https://deno.land/std/http/server.ts";
import { delay } from "https://deno.land/std/async/mod.ts";

import { router } from "./routes.ts.js";

const server = serve({ port: 8080 });
console.log("HTTP Server app is running.");

const handleRequest = async req => {
  const url = new URL(req.url, "https://localhost");

  const res = {};
  res.headers = new Headers();

  try {
    const route = router.match(url.pathname);

    if (route === null) {
      res.status = 404;
      res.body = `Not found`;
      req.respond(res);
      return;
    }

    await route.handler(req, res);
  } catch (err) {
    res.status = 500;
    res.body = `Internal server error`;
  }
};

(async () => {
  for await (const req of server) {
    handleRequest(req);
  }
})();
