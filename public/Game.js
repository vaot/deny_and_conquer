let jQuery = require('jquery');

module.exports = class Game {
  constructor() {
    this.$submitBtn = jQuery("#play");
    this.$usernameInput = jQuery("#username");
    this.$gameIdInput = jQuery("#game_id");
    this.$numberOfBoxesInput = jQuery("#number_boxes");
    this.$userColorInput = jQuery("#user_color");
  }

  init() {
    this.$submitBtn.on('click', (e) => {
      e.preventDefault();

      if (this.isValidInputs()) {
        // TO DO: Send this to ipcMain
        console.log(this.getForm());
      }
    });
  }

  getForm() {
    return {
      username: this.$usernameInput.val(),
      game_id: this.$gameIdInput.val(),
      boxes: this.$numberOfBoxesInput.val(),
      color: this.$userColorInput.val()
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
}
