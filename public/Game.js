let jQuery = require('jquery');
const { ipcRenderer } = require('electron');
let CanvasController = require('./grid.js');


module.exports = class Game {
  constructor(gridObj) {
    this.master = false;
    this.grid = null;
    this.initialized = false;
    this.$submitBtn = jQuery("#play");
    this.$usernameInput = jQuery("#username");
    this.$gameIdInput = jQuery("#game_id");
    this.$numberOfBoxesInput = jQuery("#number_boxes");
    this.$userColorInput = jQuery("#user_color");
    this.$percentageInput = jQuery("#percentage_takeover");
    this.$gridSection = jQuery("#grid_section");
    this.$formSection = jQuery("#form_section");
    this.$gameSection = jQuery("#game_section");
    this.id = this._generateId();
    this.buffer = [];
    this.scoreSheet = {};
  }

  init() {
    this.$submitBtn.on('click', (e) => {
      e.preventDefault();

      if (this.isValidInputs()) {
        if (!this.master) {
          if (this.user) {
            let form = this.getForm();

            this.user.username = form.username;
            this.user.color = form.color;

            ipcRenderer.send('session', this.user);
          };
          alert("An user has already initiated the game session!");
          return;
        }

        this.user = this.getForm();
        ipcRenderer.send('configuration', this.user);

        this.initGrid();

        this.$formSection.hide();
        this.$gameSection.show();
      }
    });
  }

  insertScore(payload) {
    payload = payload.args;

    if (!this.scoreSheet[`${payload.username}:${payload.color}`]) {
      this.scoreSheet[`${payload.username}:${payload.color}`] = [];
    }
    this.scoreSheet[`${payload.username}:${payload.color}`].push(payload);

    let result = [];
    let total = 0;

    Object.entries(this.scoreSheet).forEach(([key, val]) => {
      let parts = key.split(":");

      total += val.length;

      result.push({
        count: val.length,
        username: parts[0],
        color: parts[1]
      })
    });

    if (total >= (this.user.boxes**2) && this.initialized) {
      jQuery('body').addClass('game-over');
    }

    result.sort((r, l) => {  l.count - r.count; });

    let $body = this.$gameSection.find('table tbody');
    $body.html("");
    let index = 1;
    result.forEach((obj) => {
      console.log(obj);
      $body.append(`
        <tr>
          <th scope="col">${index}</th>
          <td>${obj.username}</td>
          <td>${obj.count}</td>
          <td style='background: ${obj.color};'>${obj.color}</td>
        </tr>
      `);
      index += 1;
    });

  }

  getForm() {
    return {
      username: this.$usernameInput.val(),
      game_id: this.$gameIdInput.val(),
      boxes: parseInt(this.$numberOfBoxesInput.val(), 10),
      color: this.$userColorInput.val(),
      percentage_takeover: parseInt(this.$percentageInput.val(), 10),
      id: this.id
    }
  }

  getGrid() {
    return this.grid;
  }

  getConfig() {
    return this.user;
  }

  setConfiguration(args) {
    this.user = args;
  }

  setMaster() {
    this.master = true;
  }

  initWithSession(user) {
    this.user.color = user.color;
    this.initGrid();
    this.$formSection.hide();
    this.$gameSection.show();
  }

  initGrid() {
    this.grid = new CanvasController(this.user.boxes, this.user.percentage_takeover/100, this.user.color, 5, this);
    this.grid.drawGrid();
    this.initialized = true;

    if (this.buffer.length > 0 && !this.master) {
      this.buffer.forEach((payload) => {
        this.grid.fillBlock(
          payload.args.range,
          payload.args.color,
          payload.args.xIndex,
          payload.args.yIndex
         );
      });
    }
  }

  isValidInputs() {
    let form = this.getForm();
    let isValid = !!form.username;

    isValid = !!form.game_id && isValid;
    isValid = !!form.boxes && isValid;
    isValid = !!form.color && isValid;

    return isValid;
  }

  _generateId() {
    return (Math.random().toString(36).substring(2,10) + Math.random().toString(36).substring(2,10));
  }
}
