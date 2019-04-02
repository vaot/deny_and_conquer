const net = require('net');
const ip = require("ip");
const addr = ip.address();
const dgram = require('dgram');

module.exports.GameServer = class GameServer {
  constructor(engine) {
    this.engine = engine;
    this.redis = engine.redis;
    this.win = engine.win;
    this.serve = this.serve.bind(this);
    this.udpChannel = dgram.createSocket('udp4');
    this.clients = new Set();
    this.configuration = null;
  }

  run() {
    let server = net.createServer(this.serve);

    server.listen(0, () => {
      let message = JSON.parse(this.engine.clientEngine._toMessage('whoami', "master" ));
      console.log("Running server!! ", message);

      setTimeout(() => { this.win.webContents.send('message', message) }, 1000);
    });

    let globalId = `${addr}:${server.address().port}`;

    this.engine.setMode(globalId, () => {
      if (this.engine.mode != 'server') {
        server.close();
      }

      if (this.clients.size <= 0) {
        this.clearState();
        this.engine.clearSession();
      }

      this.engine.runAsClient();
    });
  }

  serve(socket) {
    socket.on('data', (chunk) => {
      let payload;

      try {
        payload = [JSON.parse(chunk.toString())];
      } catch(error) {
        payload = chunk.toString()
          .split("\r\n")
          .filter((d) => d != '')
          .map((d) => JSON.parse(d));
      }

      payload.forEach((msg) => {
        this.onMessage(msg);
      });

      socket.write(JSON.stringify({ type: "keepalive" }));
    });

    socket.on('end', socket.end);
  }

  onMessage(payload) {
    switch (payload.type) {
    case "move":
      this.broadCast(payload);
      break;
    case "occupied":
      this.engine.redis.lpush("occupied-blocks", JSON.stringify(payload), (err, reply) => {
        this.broadCast(payload);
      });
      break;
    case "connect":
      this.clients.add(payload.args.addr);

      setTimeout(() => {
        this.engine.redis.lrange([ 'occupied-blocks', 0, -1 ], (err, reply) => {
          reply.forEach((msg) => {
            msg = JSON.parse(msg);
            msg.args.replay = true;

            this.uniCast(msg, payload.args.addr);
          });
        });
      }, 1000);


      let clientsChangedMsg = JSON.parse(
        this.engine.clientEngine._toMessage('clients_changed', Array.from(this.clients))
      );

      this.broadCast(clientsChangedMsg);

      if (!!this.configuration) {
        setTimeout(() => { this.broadCast(this.configuration); }, 1000);
      }
      break;
    case "configuration":
      if (!this.configuration) {
        console.log("Setting configuration!!!!!");
        this.configuration = payload;
      }
      this.broadCast(this.configuration);
    default:
      break;
    }
  }

  clearState() {
    this.engine.redis.del('occupied-blocks');
  }

  broadCast(payload) {
    this.clients.forEach((client) => {
      this.uniCast(payload, client);
    });
  }

  uniCast(payload, client) {
    let parts = client.split(":");
    let port = parseInt(parts[1], 10);
    let host = parts[0];

    this.udpChannel.send(Buffer.from(JSON.stringify(payload)), port, host, (err, da) => {
      if (err) {
        this.udpChannel.close();
        this.clients.delete(client);
        console.log("Cannot connect to channels.");
        console.log(err);
      }
    })
  }
}
