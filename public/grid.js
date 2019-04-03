const { ipcRenderer } = require('electron');
let started = false, ctx, gridArr = [], gridArr_x = [], gridArr_y = [], range = [], last_x, last_y, area = 0, occupyArr = [], start_x, start_y, canvas;


module.exports = class Grid {
    constructor (size, percentage, penColor, penWidth, game) {
        this.game = game;
        this.size = size;
        this.percentage = percentage;
        this.penColor = penColor;
        this.penWidth = penWidth;
        canvas = document.getElementById("grid");
        canvas.width = this.size * 50;
        canvas.height = this.size * 50;
        if (canvas.getContext) {
            ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(0, 0, 0, 0)';
            ctx.fillRect(0, 0, canvas.width,canvas.height);
        } else {
            console.log("not support");
        }
        canvas.onmousedown = event => this.onMouseDown(event);
        canvas.onmouseup = event => this.onMouseUp(event);
        canvas.onmousemove = event => this.onMouseMove(event);
    }

    getColor() {
        return this.penColor;
    }

    getWidth() {
        return this.penWidth;
    }

    fillBlock(range, color, x, y) {
        ctx.beginPath();
        ctx.rect(range[0], range[2], range[1] - range[0], range[3]-range[2]);
        ctx.fillStyle = color;
        ctx.fill();
        this.fillGridRemote(x, y);
        ctx.closePath();
    }

    drawGrid() {
        var w = canvas.width;
        var h = canvas.height;
        var dx = 50;
        var dy = 50;

        var x = 0;
        var y = 0;

        var xy = 10;
        ctx.beginPath();
        ctx.lineWidth = 1;

        while (y < h) {
            y = y + dy;
            ctx.moveTo(x, y);
            ctx.lineTo(w, y);
            ctx.stroke();
            // gridArr_x.push(x);
            gridArr_y.push(y);
        }

        y =0;
        xy =10;
        while (x < w) {
            x = x + dx;
            ctx.moveTo(x, y);
            ctx.lineTo(x,h);
            ctx.stroke();
            gridArr_x.push(x);
            // gridArr_y.push(y);
        }
        gridArr_x.unshift(0);
        gridArr_y.unshift(0);
        gridArr = this.create2DArray(gridArr_x.length, gridArr_y.length);
    }

    onMouseDown(event) {
        console.log("mouse down");
        // ctx.beginPath();

        // ctx.moveTo(event.layerX, event.layerY);
        // console.log(event.layerX, event.layerY);
        range = this.getMouseRange(event.layerX, event.layerY);
        // console.log("range is", range);
        started = true;
        occupyArr = this.create2DArray(Math.floor(50 / this.penWidth), Math.floor(50 / this.penWidth));

        // console.log(gridArr);
        start_x = range[0];
        start_y = range[2];
    }

    onMouseUp(event) {
        console.log("mouse up");
        started = false;
        // ctx.closePath();
    }

    onMouseMove(event) {
        ctx.fillStyle = this.penColor;

        if (started && gridArr[range[0]/50][range[2]/50] == 0) {
            if (event.layerX >= range[0] + 3 && event.layerX <= range[1] -3 && event.layerY >= range[2] + 3 && event.layerY <= range[3] - 3) {
                // ctx.beginPath();
                // ctx.arc(event.layerX, event.layerY, this.penWidth / 2, 0, 2 * Math.PI, true);
                // ctx.fill();

                ipcRenderer.send('move', JSON.stringify({
                    x: event.layerX,
                    y: event.layerY,
                    color: this.getColor(),
                }));


                last_x = event.layerX;
                last_y = event.layerY;

                if (this.occupied()) {
                    ctx.beginPath();
                    ctx.rect(range[0], range[2], range[1] - range[0], range[3]-range[2]);
                    ctx.fillStyle = this.penColor;
                    ctx.fill();
                    started = false;
                    var xIndex = range[0] / 50;
                    var yIndex = range[2] / 50;
                    // gridArr[xIndex][yIndex] = 1;

                    ipcRenderer.send('occupied', {
                        range: range,
                        color: this.getColor(),
                        xIndex: xIndex,
                        yIndex: yIndex,
                        username: game.user.username
                    });
                }
            }
        }
    }

    fillGridRemote(x, y) {
        gridArr[x][y] = 1;
    }

    getMouseRange(x, y) {
        var min_x = 0, max_x = 0, min_y = 0, max_y = 0, rangeArr = [];
        for (var i=0; i<gridArr_x.length - 1;i++) {
            if (x >= gridArr_x[i] && x <= gridArr_x[i+1]) {
                min_x = gridArr_x[i];
                max_x = gridArr_x[i+1];
            }
        }
        for (var i=0; i<gridArr_y.length - 1; i++) {
            if (y >= gridArr_y[i] && y <= gridArr_y[i+1]) {
                min_y = gridArr_y[i];
                max_y = gridArr_y[i+1];
            }
        }
        rangeArr.push(min_x, max_x,min_y, max_y);
        return rangeArr;
    }

    create2DArray(row, col) {
        var arr2D = new Array(row);
        for (var i=0; i<row; i++) {
            arr2D[i] = new Array(col);
            for (var j=0; j<col; j++) {
                arr2D[i][j] = 0;
            }
        }

        return arr2D;
    }
    occupied() {
        this.fill2DArray();
        var percentage = this.percentage;
        var row = occupyArr.length;
        var col = occupyArr[0].length;
        var threshold = row * col * percentage;
        var total = 0;
        for (var i=0; i<row; i++) {
            for (var j=0; j<col; j++) {
                total += occupyArr[i][j];
            }
        }
        if (total >= threshold) {
            return true;
        }
        return false;
    }

    fill2DArray() {
        var xPos = last_x - start_x;
        var yPos = last_y - start_y;
        var xIndex = Math.floor(xPos / this.penWidth);
        var yIndex = Math.floor(yPos / this.penWidth);
        var row = occupyArr.length;
        var col = occupyArr[0].length;
        if (xIndex < row && yIndex < col )
            occupyArr[xIndex][yIndex] = 1;
    }

}
