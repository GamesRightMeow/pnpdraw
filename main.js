let paint = false;
let pan = false;
let panOffset = { x: 0, y: 0 };
let lastPanPos = { x: 0, y: 0 };
let scale = 1;
let lastScaleDis = 0;
let pinchMode = false;
let pinchStart = 0;
let pinchModeAccum = 0;

let fullscreenButton = document.getElementById('fullscreen');
fullscreenButton.addEventListener("click", (e) => { 
  if (document.fullscreenElement) {
    document.exitFullscreen().then(() => {
      rebuildMainCanvas();
      redraw();
    });
  } else {
    document.documentElement.requestFullscreen().then(() => {
      rebuildMainCanvas();
      redraw();
    });
  }
});

let drawButton = document.getElementById('draw');
drawButton.style.display = "none";
drawButton.addEventListener("click", (e) => { 
  drawContext.strokeStyle = "rgba(0, 0, 0, 1)";
  drawContext.globalCompositeOperation='source-over';
  eraseButton.style.display = "inline";
  drawButton.style.display = "none";
});

let eraseButton = document.getElementById('erase');
eraseButton.addEventListener("click", (e) => { 
  drawContext.strokeStyle = "rgba(1, 1, 1, 0.5)";
  drawContext.globalCompositeOperation='destination-out';
  eraseButton.style.display = "none";
  drawButton.style.display = "inline";
});

let zoomSlider = document.getElementById("zoom");
zoomSlider.value = 100;
zoomSlider.addEventListener("input", (e) => { 
  scale = zoomSlider.value / 100;
  redraw();
});

let sizeSlider = document.getElementById("size");
sizeSlider.value = 20;
sizeSlider.addEventListener("input", (e) => { 
  drawContext.lineWidth = (sizeSlider.value / 100) * 48 + 2;
});

let mainCanvas = null;
let mainContext = null;
rebuildMainCanvas();

let drawCanvas = document.createElement('canvas');
drawCanvas.width = mainCanvas.width;
drawCanvas.height = mainCanvas.height;
let drawContext = drawCanvas.getContext("2d");

let gamesheetImg = new Image;
let imageInput = document.getElementById('gamesheet');
imageInput.onchange = (e) => {
  gamesheetImg.onload = function() {
    rebuildDrawCanvas(gamesheetImg.width, gamesheetImg.height);
    redraw()
  }
  gamesheetImg.src = URL.createObjectURL(e.target.files[0]);
};

function rebuildMainCanvas() {
  mainCanvas = document.getElementById('mainCanvas');
  mainCanvas.width = document.body.clientWidth;
  mainCanvas.height = document.body.clientHeight;
  mainContext = mainCanvas.getContext("2d");
}

function rebuildDrawCanvas(width, height) {
  drawCanvas = document.createElement('canvas');
  drawCanvas.width = width;
  drawCanvas.height = height;
  drawContext = drawCanvas.getContext("2d");
  drawContext.lineJoin = "round";
  drawContext.strokeStyle = "rgba(0, 0, 0, 1)";
  drawContext.lineWidth = (sizeSlider.value / 100) * 48 + 2;
}

/**
 * Redraw the complete canvas.
 */
function redraw() {
  mainContext.setTransform(1, 0, 0, 1, 0, 0);

  // must always be set to ensure fullscreen doesn't go black
  mainContext.fillStyle = "#ffffff";
  
  mainContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);

  mainContext.scale(scale, scale);
  mainContext.translate(panOffset.x, panOffset.y);

  let x = (mainCanvas.width / scale - drawCanvas.width) / 2;
  let y = (mainCanvas.height / scale - drawCanvas.height) / 2;
  mainContext.drawImage(gamesheetImg, x, y);
  mainContext.drawImage(drawCanvas, x, y);

  drawContext.setTransform(1, 0, 0, 1, 0, 0);
  drawContext.translate(-panOffset.x, -panOffset.y);
}

function mouseDownEventHandler(e) {
  let x = e.pageX - mainCanvas.offsetLeft;
  let y = e.pageY - mainCanvas.offsetTop;

  if (e.buttons == 1) {
    paint = true;
    let lx = (x / scale) - ((mainCanvas.width / scale - drawCanvas.width) / 2);
    let ly = (y / scale) - ((mainCanvas.height / scale - drawCanvas.height) / 2);
    drawContext.beginPath();
    drawContext.moveTo(lx, ly);
    drawContext.stroke();
    redraw();
  } else if (e.buttons == 2) {
    pan = true;
    lastPanPos.x = x;
    lastPanPos.y = y;
  }
}

function touchstartEventHandler(e) {
  paint = true;
  pinchMode = 0;
  pinchModeAccum = 0;
  pinchStart = Date.now();

  let x1 = e.touches[0].pageX - mainCanvas.offsetLeft;
  let y1 = e.touches[0].pageY - mainCanvas.offsetTop;

  if (e.touches.length > 1) {
    let x2 = e.touches[1].pageX - mainCanvas.offsetLeft;
    let y2 = e.touches[1].pageY - mainCanvas.offsetTop;
    let midX = (x1 + x2)/2;
    let midY = (y1 + y2)/2;
    lastPanPos.x = midX;
    lastPanPos.y = midY;
    lastScaleDis = Math.hypot(x2 - x1, y2 - y1);
  } else {
    let lx = (x1 / scale) - ((mainCanvas.width / scale - drawCanvas.width) / 2);
    let ly = (y1 / scale) - ((mainCanvas.height / scale - drawCanvas.height) / 2);
    drawContext.beginPath();
    drawContext.moveTo(lx, ly);
    drawContext.stroke();
    redraw();
  }
}

function touchEndEventHandler(e) {
  drawContext.closePath();
  paint = false;
  pan = false;
}

function mouseUpEventHandler(e) {
  drawContext.closePath();
  paint = false;
  pan = false;
}

function mouseMoveEventHandler(e) {
  let x = e.pageX - mainCanvas.offsetLeft;
  let y = e.pageY - mainCanvas.offsetTop;
  
  if (paint) {
    let lx = (x / scale) - ((mainCanvas.width / scale - drawCanvas.width) / 2);
    let ly = (y / scale) - ((mainCanvas.height / scale - drawCanvas.height) / 2);
    drawContext.lineTo(lx, ly);
    drawContext.stroke();
    redraw();
  }

  if (pan) {
    let dx = x - lastPanPos.x;
    let dy = y - lastPanPos.y;
    let sens = (1.0 - scale) * 4;
    panOffset.x += dx * (1 + sens);
    panOffset.y += dy * (1 + sens);
    lastPanPos.x = x;
    lastPanPos.y = y;
    redraw();
  }
}

function touchMoveEventHandler(e) {
  let x1 = e.touches[0].pageX - mainCanvas.offsetLeft;
  let y1 = e.touches[0].pageY - mainCanvas.offsetTop;
  if (e.touches.length == 1) {
    if (paint) {
      let lx = (x1 / scale) - ((mainCanvas.width / scale - drawCanvas.width) / 2);
      let ly = (y1 / scale) - ((mainCanvas.height / scale - drawCanvas.height) / 2);
      drawContext.lineTo(lx, ly);
      drawContext.stroke();
      redraw();
    }
  } else {
    let x2 = e.touches[1].pageX - mainCanvas.offsetLeft;
    let y2 = e.touches[1].pageY - mainCanvas.offsetTop;
    
    let midX = (x1 + x2)/2;
    let midY = (y1 + y2)/2;
    let panDis = Math.hypot(midX - lastPanPos.x, midY - lastPanPos.y);

    let dx = midX - lastPanPos.x
    let dy = midY - lastPanPos.y
    let sens = (1.0 - scale) * 4;
    panOffset.x += dx * (1 + sens);
    panOffset.y += dy * (1 + sens);

    lastPanPos.x = midX;
    lastPanPos.y = midY;

    redraw();
  }
}

function mouseWheelEventHandler(e) {
  let dir = Math.sign(e.wheelDelta);
  scale = Math.min(1, Math.max(0.1, scale + dir * 0.01));
  zoomSlider.value = 100 * scale;
  redraw();
}

function mouseLeaveEventHandler(e) {
  paint = false;
  pan = false;
}

function mouseWins(e) {
  mainCanvas.removeEventListener('mousedown', mouseWins);
  mainCanvas.removeEventListener('touchstart', touchWins);

  mainCanvas.addEventListener('mouseup', mouseUpEventHandler);
  mainCanvas.addEventListener('mousemove', mouseMoveEventHandler);
  mainCanvas.addEventListener('mousedown', mouseDownEventHandler);
  mainCanvas.addEventListener('mouseleave', mouseLeaveEventHandler);
  mainCanvas.addEventListener('wheel', mouseWheelEventHandler);

  // disable opening context menu
  mainCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

  mouseDownEventHandler(e);
}

function touchWins(e) {
  mainCanvas.removeEventListener('mousedown', mouseWins);
  mainCanvas.removeEventListener('touchstart', touchWins);

  mainCanvas.addEventListener('touchstart', touchstartEventHandler);
  mainCanvas.addEventListener('touchmove', touchMoveEventHandler);
  mainCanvas.addEventListener('touchend', touchEndEventHandler);

  touchstartEventHandler(e);
}

mainCanvas.addEventListener('mousedown', mouseWins);
mainCanvas.addEventListener('touchstart', touchWins);
rebuildDrawCanvas(mainCanvas.width, mainCanvas.height);