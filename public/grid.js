const { ipcRenderer } = require('electron');
let started = false, ctx, gridArr_x = [], gridArr_y = [], range = [], last_x, last_y, area = 0, occupyArr = [], start_x, start_y;

const eventController = {
    onMouseDown(event) {
        console.log("mouse down");
        ctx.beginPath();

        ctx.moveTo(event.layerX, event.layerY);
        console.log(event.layerX, event.layerY);
        range = pen.getMouseRange(event.layerX, event.layerY);
        // console.log("range is", range);
        started = true;
        pen.create2DArray();
        start_x = range[0];
        start_y = range[2];
        // console.log("arr is ", occupyArr);
    },
    onMouseUp(event) {
        console.log("mouse up");
        started = false;
    },
    onMouseMove(event) {
        console.log("mouse move ", event.layerX, event.layerY);
        ctx.strokeStyle = pen.color;
        ctx.lineWidth = pen.penWidth;
        if (started) {
            if (event.layerX >= range[0] && event.layerX <= range[1] && event.layerY >= range[2] && event.layerY <= range[3]) {
                ctx.lineTo(event.layerX, event.layerY);
                ctx.stroke();

                ipcRenderer.send('move', JSON.stringify({
                    x: event.layerX,
                    y: event.layerY
                }));

                last_x = event.layerX;
                last_y = event.layerY;

                if (pen.occupied()) {
                    ctx.rect(range[0], range[2], range[1] - range[0], range[3]-range[2]);
                    ctx.fillStyle = pen.color;
                    ctx.fill();
                    started = false;

                    ipcRenderer.send('occupied', {
                        range: range
                    });
                }
            }
        }
    }
};

const pen = {
    color: 'rgb(255, 165, 0)',
    penWidth: 5,
    dx: 50,
    dy: 50,
    drawGrid(w, h) {
        var dx = this.dx;
        var dy = this.dy;

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
    },
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
    },
    create2DArray() {
        var row = Math.floor(this.dx / this.penWidth);
        var col = Math.floor(this.dy / this.penWidth);
        occupyArr = new Array(row);
        for (var i=0; i<row; i++) {
            occupyArr[i] = new Array(col);
            for (var j=0; j<col; j++) {
                occupyArr[i][j] = 0;
            }
        }
    },
    fill2DArray() {
        var xPos = last_x - start_x;
        var yPos = last_y - start_y;
        var xIndex = Math.floor(xPos / this.penWidth);
        var yIndex = Math.floor(yPos / this.penWidth);
        var row = occupyArr.length;
        var col = occupyArr[0].length;
        if (xIndex < row && yIndex < col )
            occupyArr[xIndex][yIndex] = 1;
    },
    occupied() {
        this.fill2DArray();
        var percentage = 0.5;
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
};


function initCanvas() {
    const canvas = document.getElementById("grid");

    if (canvas.getContext) {
        ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width,canvas.height);
        var w = canvas.width;
        var h = canvas.height;
        pen.drawGrid(w, h);
        canvas.onmousedown = event => eventController.onMouseDown(event);
        canvas.onmouseup = event => eventController.onMouseUp(event);
        canvas.onmousemove = event => eventController.onMouseMove(event);
        // console.log(gridArr_x);
        // console.log(gridArr_y);
    } else {
        console.log("not support");
    }
}


window.onload = initCanvas();
module.exports = { controller: eventController, pen: pen };
