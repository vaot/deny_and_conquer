let jQuery = require('jquery');
const { ipcRenderer } = require('electron');
let CanvasController = require('./grid.js');


module.exports = class Game {
  constructor(gridObj) {
    this.master = false;
    this.grid = null;
    this.$submitBtn = jQuery("#play");
    this.$usernameInput = jQuery("#username");
    this.$gameIdInput = jQuery("#game_id");
    this.$numberOfBoxesInput = jQuery("#number_boxes");
    this.$userColorInput = jQuery("#user_color");
    this.$percentageInput = jQuery("#percentage_takeover");
    this.$gridSection = jQuery("#grid_section");
    this.$formSection = jQuery("#form_section");
    this.id = this._generateId();
  }

  init() {
    this.$submitBtn.on('click', (e) => {
      e.preventDefault();

      if (this.isValidInputs()) {
        if (!this.master) {
          if (this.user) {
            let form = this.getForm();

            this.user.color = form.color;
            this.initGrid();
            this.$formSection.hide();
            this.$gridSection.show();
          };
          alert("An user has already initiated the game session!");
          return;
        }

        this.user = this.getForm();
        ipcRenderer.send('configuration', this.user);

        this.initGrid();

        this.$formSection.hide();
        this.$gridSection.show();
      }
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

  setConfiguration(args) {
    this.user = args;
  }

  setMaster() {
    this.master = true;
  }

  initGrid() {
    this.grid = new CanvasController(this.user.boxes, this.user.percentage_takeover/100, this.user.color, 5);
    this.grid.drawGrid();
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
