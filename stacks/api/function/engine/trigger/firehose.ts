import {Module, OnModuleInit} from "@nestjs/common";
import {HttpAdapterHost} from "@nestjs/core";
import * as url from "url";
import * as ws from "ws";
import {Info, InvokerFn, Target, Trigger, TriggerFlags, TriggerSchema} from "./base";

export class FirehoseClient {
  constructor(private client: any) {}

  get remoteAddress() {
    return this.client.remoteAddress;
  }

  send(name: string, data: any) {
    this.client.send(JSON.stringify({name, data}));
  }
}

export class FirehosePool {
  constructor(private wss: any) {}

  get size() {
    return this.wss.clients.size;
  }

  send(name: string, data: any) {
    const raw = JSON.stringify({name, data});
    this.wss.clients.forEach((client: any) => {
      if (client.readyState === ws.OPEN) {
        client.send(raw);
      }
    });
  }
}

export interface FirehoseOptions {
  event: "connection" | "disconnect" | string;
}

@Trigger({
  name: "firehose",
  flags: TriggerFlags.NotSubscribable
})
export class FirehoseTrigger implements Trigger<FirehoseOptions>, OnModuleInit {
  private eventTargetMap = new Map<string, {event: string; invoker: InvokerFn; target: Target}>();

  wss: ws.Server;

  private pool: FirehosePool;

  constructor(private http: HttpAdapterHost) {}

  onModuleInit() {
    this.wss = new ws.Server({noServer: true});
    this.pool = new FirehosePool(this.wss);

    this.wss.on("connection", ws => {
      const cl = new FirehoseClient(ws);
      this.invoke("connection", cl);
      ws.on("message", (raw: string) => {
        console.log(raw);
        try {
          const event = JSON.parse(raw);
          console.log(event);
          if (typeof event.name == "string" ) {
            this.invoke(event.name, cl, event.data);
          }
        } catch {}
      });
      ws.on("close", () => this.invoke("close", cl));
    });

    const server = this.http.httpAdapter.getHttpServer();
    const [socketIoUpgrade] = server.listeners("upgrade");
    server.removeAllListeners("upgrade");
    server.on("upgrade", (request, socket, head) => {
      const pathname = url.parse(request.url).pathname;

      if (pathname == "/firehose") {
        this.wss.handleUpgrade(request, socket, head, ws =>
          this.wss.emit("connection", ws, request)
        );
      } else if (socketIoUpgrade) {
        socketIoUpgrade(request, socket, head);
      } else {
        socket.destroy();
      }
    });
  }

  invoke(event: string, client: any, data?: any) {
    for (const pair of this.eventTargetMap.values()) {
      if (pair.event == event || (pair.event == "*" && event == "connection" || event == "close")) {
        pair.invoker({
          target: pair.target,
          parameters: [{client, pool: this.pool}, {event, data}]
        });
      }
    }
  }

  register(invoker: InvokerFn, target: Target, options: FirehoseOptions) {
    const key = `${options.event}_${target.id}_${target.handler}`;
    if (invoker) {
      this.eventTargetMap.set(key, {event: options.event, invoker, target});
    } else {
      this.eventTargetMap.delete(key);
    }
  }

  schema(): Promise<TriggerSchema> {
    return Promise.resolve({
      $id: "http://spica.internal/function/triggers/firehose/schema",
      title: "Firehose",
      description: "A low latency realtime trigger for functions",
      type: "object",
      required: ["event"],
      properties: {
        event: {
          title: "Event",
          description:
            "For connection events use 'connection' or 'close'. For custom events use the event name or '*' for all events.",
          type: "string"
        }
      },
      additionalProperties: false
    });
  }

  info(options: FirehoseOptions): Promise<Info[]> {
    const info: Info = {
      icon: "compare_arrows",
      text: options.event == "*" ? "Firehose: All events" : `Firehose: on ${options.event}`,
      type: "label"
    };
    return Promise.resolve([info]);
  }
}

@Module({
  providers: [FirehoseTrigger],
  exports: [FirehoseTrigger]
})
export class FirehoseTriggerModule {}
