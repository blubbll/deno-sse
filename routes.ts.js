import { Router } from "./router.ts";
import { delay } from "https://deno.land/std/async/mod.ts";
import { ServerRequest } from "https://deno.land/std/http/server.ts";

const encodeHeader = res => {
  const protoMajor = 1;
  const protoMinor = 1;
  const statusCode = res.status || 200;
  let out = `HTTP/${protoMajor}.${protoMinor} ${statusCode}\r\n`;

  const headers = res.headers || new Headers();

  for (const [key, value] of headers) {
    out += `${key}: ${value}\r\n`;
  }
  out += `\r\n`;

  return new TextEncoder().encode(out);
};

export const router = new Router();

router.add("/", async (req, res) => {
  res.status = 200;
  res.body = await window.Deno.open("./views/index.html");

  req.respond(res);
});

let requests = [];

router.add("/events", async (req, res) => {
  res.headers.set("Content-Type", "text/event-stream");
  res.headers.set("Connection", "keep-alive");
  res.headers.set("Cache-Control", "no-cache");

  await req.w.write(encodeHeader(res));
  await req.w.flush();

  requests.push(req);
});

setInterval(()=>{
  console.log(requests)
}, 999)

router.add("/messages", async (req, res) => {
  const message = String(
    new URL(req.url, "http://localhost:8080").searchParams.get("message")
  );
  for (const request of requests) {
    try {
      await request.w.write(
        new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`)
      );
      await request.w.flush();
    } catch (err) {
      requests.splice(requests.indexOf(request), 1);
    }
  }
  res.body = "";
  req.respond(res);
});
