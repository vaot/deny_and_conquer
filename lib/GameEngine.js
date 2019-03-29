const RedisServer = require('./RedisClient');
const { GameClient } = require('./GameClient');
const { GameServer } = require('./GameServer');

const net = require('net');
const { ipcMain } = require('electron');
const redis = require("redis");
const REGISTRY_HOST = "127.0.0.1";
const REGISTRY_PORT = "6379";

const MASTER_KEY = "main-server";

module.exports.GameEngine = class GameEngine {

  constructor(browserWin) {
    this.win = browserWin;
    this.redis = redis.createClient();
    this.mode = 'client';
    this.serverAddr = "";
    this.clientEngine = new GameClient(this);
    this.serverEngine = new GameServer(this);
  }

  setup() {
    this.redis.get(MASTER_KEY, (err, reply) => {
      if (!!reply) {
        this.mode = 'client';
        this.serverAddr = reply;
        this.runAsClient();
      } else {
        this.mode = 'server';
        this.runAsServer();
      }
    });

  }

  runAsClient() {
    this.clientEngine.run();
  }

  runAsServer() {
    this.serverEngine.run();
  }

  setMode(globalId, callback) {
    this.redis.setnx(MASTER_KEY, globalId, (err, data) => {
      if (!data) {
        this.mode = 'client';
      } else {
        this.mode = 'server';
        this.serverAddr = globalId;
      }
      callback(this.mode);
    });
  }

  reset() {
    this.redis.del(MASTER_KEY, () => {
      this.setup();
    });
  }

  reattach() {
    this.setup();
  }

  getMaster(callback) {
    this.redis.get(MASTER_KEY, (err, reply) => {
      callback(reply);
    });
  }
}
