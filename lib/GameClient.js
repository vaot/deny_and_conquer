const { ipcMain } = require('electron');
const net = require('net');
const ip = require("ip");
const addr = ip.address();
const dgram = require('dgram');

module.exports.GameClient = class GameClient {
  constructor(engine) {
    this.engine = engine;
    this.redis = engine.redis;
    this.win = engine.win;
    this.udpChannel = dgram.createSocket('udp4');
    this.initialized = false;
    this.clients = new Set();
  }

  run() {
    let master = this.engine.serverAddr;
    let parts = master.split(":");

    this.port = parseInt(parts[1], 10);
    this.host = parts[0];

    let client = new net.Socket();
    client.connect(this.port, this.host, () => {

      if (!this.initialized) {
        this.udpChannel.on('message', (msg, rinfo) => {
          let payload = JSON.parse(msg);

          switch (payload.type) {
          case "configuration":
            this.engine.serverEngine.configuration = payload;
          case "move":
          case "occupied":
            // Since every client could be a server, this client has to keep its server isntance
            // up to date.
            this.win.webContents.send('message', payload);
            break;
          case "clients_changed":
            this.clients = new Set(payload.args);
            this.engine.serverEngine.clients = this.clients;
            break;
          default:
            break;
          }

        });

        this.udpChannel.bind(0, () => {
          client.write(this._toMessage('connect', { addr: `${addr}:${this.udpChannel.address().port}` }));

          this.spawnKeepAliveWorker(client);
        });

        this.initialized = true;
      } else {
        this.spawnKeepAliveWorker(client);
        client.write(this._toMessage('connect', { addr: `${addr}:${this.udpChannel.address().port}` }));
      }

      ipcMain.on('move', (event, args) => {
        client.write(this._toMessage('move', JSON.parse(args)));
      });

      ipcMain.on('session', (event, args) => {
        console.log('New session!!!');
        this.engine.retrieveOrSaveSession(args, (reply) => {
          this.win.webContents.send('message', { type: 'session', args: reply });
        });
      });

      ipcMain.on('occupied', (event, args) => {
        client.write(this._toMessage('occupied', args));
      });

      ipcMain.on('configuration', (event, args) => {
        let msg = this._toMessage('configuration', args);
        client.write(msg);
      });
    });

    client.on('error', (err) => {
      ipcMain.removeAllListeners('move');
      ipcMain.removeAllListeners('occupied');

      if (this.workerKeepAlive) {
        clearInterval(this.workerKeepAlive);
      }

      this.engine.getMaster((latestMaster) => {
        if (master == latestMaster) {
          this.engine.reset();
        } else {
          this.engine.reattach();
        }
      });
    })
  }

  spawnKeepAliveWorker(client) {
    this.workerKeepAlive = setInterval(() => {
      let fullAddr = `${addr}:${this.udpChannel.address().port}`;
      client.write(this._toMessage('keepalive', { addr: fullAddr }));
    }, 1000);
  }

  _toMessage(type, args) {
    return JSON.stringify({
      type: type,
      args: args,
      ip: addr,
      timestamp: new Date().getTime()
    }) + "\r\n";
  }
}
