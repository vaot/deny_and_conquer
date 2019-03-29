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
    this.clients = [];
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

          if (['move', 'occupied'].includes(payload.type)) {
            this.win.webContents.send('message', payload);
          }
        });

        this.udpChannel.bind(0, () => {
          client.write(this._toMessage('connect', { addr: `${addr}:${this.udpChannel.address().port}` }));
        });

        this.initialized = true;
      } else {
        client.write(this._toMessage('connect', { addr: `${addr}:${this.udpChannel.address().port}` }));
      }

      ipcMain.on('move', (event, args) => {
        client.write(this._toMessage('move', JSON.parse(args)));
      });

      ipcMain.on('occupied', (event, args) => {
        console.log("SENDING occupied!!");
        client.write(this._toMessage('occupied', args));
      });

    });

    client.on('error', (err) => {
      ipcMain.removeAllListeners('move');
      ipcMain.removeAllListeners('occupied');

      this.engine.getMaster((latestMaster) => {
        if (master == latestMaster) {
          this.engine.reset();
        } else {
          this.engine.reattach()
        }
      });
    })
  }

  _toMessage(type, args) {
    return JSON.stringify({
      type: type,
      args: args,
      ip: addr
    }) + "\r\n";
  }
}
