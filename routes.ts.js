import { delay } from "https://deno.land/std/async/mod.ts";
import { ServerRequest } from "https://deno.land/std/http/server.ts";

export class Router {
  constructor() {
    this.routes = [];
  }
  add(pathname, handler) {
    const route = { pathname, handler };
    this.routes.push(route);
  }
  match(pathname) {
    for (const route of this.routes) {
      if (route.pathname === pathname) return route;
    }
    return null;
  }
}

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

let clients = [];

router.add("/events", async (req, res) => {
  res.headers.set("Content-Type", "text/event-stream");
  res.headers.set("Connection", "keep-alive");
  res.headers.set("Cache-Control", "no-cache");

  await req.w.write(encodeHeader(res));
  await req.w.flush();

  let guid = uuidv4();
  while (clients.find(x => x.guid === guid)) guid = uuidv4();

  clients.push({ guid, conn: req });
});

setInterval(async () => {
  for (const client of clients) {
    const peer = client.conn.w;
    try {
      await peer.write(
        new TextEncoder().encode(
          `data: ${JSON.stringify({
            packet: "cons",
            content: clients.length
          })}\n\n`
        )
      );
      await peer.flush();
    } catch (err) {
      console.log(`${client.guid} disconnected!`);
      clients.splice(clients.indexOf(client), 1);
    }
  }
}, 999);

router.add("/messages", async (req, res) => {
  const message = String(
    new URL(req.url, "http://localhost:8080").searchParams.get("message")
  );
  for (const request of clients) {
    const peer = request.conn.w;
    console.log(peer);
    try {
      await peer.write(
        new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`)
      );
      await peer.flush();
    } catch (err) {
      clients.splice(clients.indexOf(request), 1);
    }
  }
  res.body = "";
  req.respond(res);
});

//guid
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
