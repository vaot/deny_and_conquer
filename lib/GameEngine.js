const { GameClient } = require('./GameClient');
const { GameServer } = require('./GameServer');

const net = require('net');
const { ipcMain } = require('electron');
const redis = require("redis");
const REGISTRY_HOST = "207.23.196.55";
const REGISTRY_PORT = "6379";

const MASTER_KEY = "main-server";
const SESSIONS_KEY = "game-server-sessions";

module.exports.GameEngine = class GameEngine {

  constructor(browserWin) {
    this.win = browserWin;
    this.redis = redis.createClient({ host: REGISTRY_HOST, port: REGISTRY_PORT });
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

  clearSession() {
    this.redis.del(SESSIONS_KEY);
  }

  retrieveOrSaveSession(payload, callback) {
    this.redis.hget(SESSIONS_KEY, `${payload.game_id}:${payload.username}`, (err, reply) => {
      if (!reply) {
        this.redis.hset(SESSIONS_KEY, `${payload.game_id}:${payload.username}`, JSON.stringify(payload), (err, reply) => {
          if (!err) {
            callback(payload);
          }
        });
      } else {
        callback(JSON.parse(reply));
      }
    });
  }
}
