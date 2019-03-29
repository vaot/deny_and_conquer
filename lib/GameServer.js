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
  }

  run() {
    let server = net.createServer(this.serve);

    server.listen(0, () => {
      console.log("Server running!!!");
    });

    let globalId = `${addr}:${server.address().port}`;

    this.engine.setMode(globalId, () => {
      if (this.engine.mode != 'server') {
        server.close();
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
      console.log("occupied: ", this.clients);
      this.broadCast(payload);
      break;
    case "connect":
      this.clients.add(payload.args.addr);
      this.broadCast(
        this.engine.clientEngine._toMessage('clients_changed', this.clients)
      );
      break;
    // TO DO: Add a handler for configuration
    default:
      break;
    }
  }

  broadCast(payload) {
    this.clients.forEach((client) => {
      let parts = client.split(":");
      let port = parseInt(parts[1], 10);
      let host = parts[0];

      this.udpChannel.send(Buffer.from(JSON.stringify(payload)), port, host, (err) => {
        if (err) {
          this.udpChannel.close();
          this.clients.delete(client);
          console.log("Cannot connect to channels.");
          console.log(err);
        }
      })
    });
  }
}
