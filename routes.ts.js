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

  let guid;
  if (req.url.includes("?rejoin")) {
    guid = req.url.split("guid=")[1];

    console.log(`⚪ [${guid}] reconnected!`);

    pushData(req, {
      packet: "msg",
      content: `Welcome back, ${guid}`
    });
  } else {
    guid = uuidv4();
    while (clients.find(x => x.guid === guid)) guid = uuidv4();

    const client = {
      guid,
      ip: req.headers.get("x-forwarded-for").split(",")[0],
      conn: req
    };

    clients.push(client);

    pushData(req, {
      packet: "guid",
      content: guid
    });

    pushData(req, {
      packet: "msg",
      content: `Welcome ${client.guid}!`
    });

    flushData(req, {
      packet: "msg",
      content: `Your IP: ${client.ip}`
    });

    console.log(`🔵 [${client.guid}] connected with ip ${client.ip}!`);
  }
});

const removeClient = client => {
  console.log(`🔴 [${client.guid}] disconnected!`);
  clients.splice(clients.indexOf(client), 1);
};

const sendData = async args => {
  const peer = args.peer.w;
  try {
    await peer.write(
      new TextEncoder().encode(`data: ${JSON.stringify(args.payload)}\n\n`)
    );
    if (args.flush === true) await peer.flush();
  } catch (e) {
    const client = clients.find(x => x.conn === args.peer);

    if (client && e.message.includes("Broken pipe")) removeClient(client);
  }
};
const flushData = async (peer, payload) => {
  sendData({ peer, payload, flush: true });
};
const pushData = async (peer, payload) => {
  sendData({ peer, payload });
};

setInterval(async () => {
  for (const client of clients) {
    const peer = client.conn.w;
    try {
      flushData(client.conn, {
        packet: "cons",
        content: clients.length
      });
    } catch (err) {}
  }
}, 999);

/*router.add("/messages", async (req, res) => {
  const message = String(
    new URL(req.url, "http://localhost:8080").searchParams.get("message")
  );
  for (const _client of clients) {
    const client = clients(Object.keys(_client)[0]);
    const peer = client.conn.w;
    console.log(peer);
    try {
      await peer.write(
        new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`)
      );
      await peer.flush();
    } catch (err) {
      clients.splice(clients.indexOf(_client), 1);
    }
  }
  res.body = "";
  req.respond(res);
});*/

//guid
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
