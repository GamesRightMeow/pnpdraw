let paint = false;
let pan = false;
let panOffset = { x: 0, y: 0 };
let lastPanPos = { x: 0, y: 0 };
let scale = 1;
let doDraw = true;
let touches = [];
let lastTouches = [];
let historyIndex = 0;
let history = [];
let doPushHistory = false;
let lastTouchTime = 0;

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

let drawEraseButton = document.getElementById('drawErase');
let drawIcon = document.getElementById('drawIcon');
let eraseIcon = document.getElementById('eraseIcon');
eraseIcon.style.display = "none";
drawEraseButton.addEventListener("click", (e) => { 
  if (doDraw) {
    drawContext.strokeStyle = "rgba(1, 1, 1, 0.5)";
    drawContext.globalCompositeOperation='destination-out';
    drawIcon.style.display = "none";
    eraseIcon.style.display = "inline";
    doDraw = false;
  } else {
    drawContext.strokeStyle = "rgba(0, 0, 0, 1)";
    drawContext.globalCompositeOperation='source-over';
    drawIcon.style.display = "inline";
    eraseIcon.style.display = "none";
    doDraw = true;
  }
});

let rollDiceButton = document.getElementById('rollDice');
rollDiceButton.addEventListener("click", (e) => { 
  var temp = document.getElementById("dieTemplate");
  var clone = temp.content.cloneNode(true);
  clone.getElementById("dieValue").innerText = Math.round(Math.random() * 5) + 1;
  let container = document.getElementById("diceContainer");
  container.appendChild(clone);
});

let clearDiceButton = document.getElementById('clearDice');
clearDiceButton.addEventListener("click", (e) => { 
  let container = document.getElementById("diceContainer");
  for (let i = container.children.length - 1; i > 0 ; i--) {
    container.removeChild(container.children[i]);
  }
});

let undoButton = document.getElementById('undo');
undoButton.addEventListener("click", (e) => undo());

let redoButton = document.getElementById('redo');
redoButton.addEventListener("click", (e) => redo());

let toolbarLower = document.getElementById("toolbarLower");
toolbarLower.style.display = "none";

let settingsButton = document.getElementById('settings');
settingsButton.addEventListener("click", (e) => { 
  if (toolbarLower.style.display == "none") {
    toolbarLower.style.display = "inline";
    panOffset.y -= toolbarLower.offsetHeight + 4;
  } else {
    panOffset.y += toolbarLower.offsetHeight + 4;
    toolbarLower.style.display = "none";
  }
  redraw();
});

let zoomSlider = document.getElementById("zoom");
zoomSlider.value = 100;
zoomSlider.addEventListener("input", (e) => { 
  scale = zoomSlider.value / 100;
  redraw();
});

let sizeSlider = document.getElementById("size");
sizeSlider.value = 10;
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

let debug = document.getElementById("debug");

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
  drawContext.lineWidth = 2;
  drawContext.strokeRect(0, 0, width, height);
  drawContext.lineWidth = (sizeSlider.value / 100) * 48 + 2;
  historyIndex = 0;
  pushHistory(); // blank state
}

function pushHistory() {
  if (historyIndex != history.length) {
    history.splice(historyIndex)
  }

  let img = new Image();
  img.src = drawCanvas.toDataURL();
  history.push(img);

  historyIndex++;
}

function undo() {
  if (historyIndex - 1 >= 1) {
    historyIndex--;
    drawContext.globalCompositeOperation='source-over';
    drawContext.setTransform(1, 0, 0, 1, 0, 0);
    drawContext.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawContext.lineWidth = 2;
    drawContext.strokeRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawContext.drawImage(history[historyIndex - 1], 0, 0);
    drawContext.lineWidth = (sizeSlider.value / 100) * 48 + 2;
    if (!doDraw) {
      drawContext.globalCompositeOperation='destination-out';
    }
    redraw();
  }
}

function redo() {
  if (historyIndex + 1 <= history.length) {
    historyIndex++;
    drawContext.globalCompositeOperation='source-over';
    drawContext.setTransform(1, 0, 0, 1, 0, 0);
    drawContext.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawContext.lineWidth = 2;
    drawContext.strokeRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawContext.drawImage(history[historyIndex - 1], 0, 0);
    drawContext.lineWidth = (sizeSlider.value / 100) * 48 + 2;
    if (!doDraw) {
      drawContext.globalCompositeOperation='destination-out';
    }
    redraw();
  }
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
    doPushHistory = true;
  } else if (e.buttons == 2) {
    pan = true;
    lastPanPos.x = x;
    lastPanPos.y = y;
  }
}

function touchstartEventHandler(e) {
  paint = true;

  for (let i = 0; i < e.changedTouches.length; i++) {
    touches.push({ 
      id: e.changedTouches[i].identifier, 
      x: e.changedTouches[i].pageX, 
      y: e.changedTouches[i].pageY, 
    });
  }

  let x1 = e.touches[0].pageX - mainCanvas.offsetLeft;
  let y1 = e.touches[0].pageY - mainCanvas.offsetTop;
  
  if (e.touches.length > 1) {
    let x2 = e.touches[1].pageX - mainCanvas.offsetLeft;
    let y2 = e.touches[1].pageY - mainCanvas.offsetTop;
    let midX = (x1 + x2)/2;
    let midY = (y1 + y2)/2;
    lastPanPos.x = midX;
    lastPanPos.y = midY;
    doPushHistory = false;
  } else {
    let lx = (x1 / scale) - ((mainCanvas.width / scale - drawCanvas.width) / 2);
    let ly = (y1 / scale) - ((mainCanvas.height / scale - drawCanvas.height) / 2);
    drawContext.beginPath();
    drawContext.moveTo(lx, ly);
    drawContext.stroke();
    redraw();
    doPushHistory = true;
  }
}

function touchEndEventHandler(e) {
  drawContext.closePath();
  paint = false;
  pan = false;

  for (let j = 0; j < e.changedTouches.length; j++) {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].id == e.changedTouches[j].identifier) {
        touches.splice(i, 1);
      }
    }
  }

  lastTouchTime = Date.now();
}

function mouseUpEventHandler(e) {
  drawContext.closePath();
  paint = false;
  pan = false;
  pushHistory();
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
  for (let j = 0; j < e.changedTouches.length; j++) {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].id == e.changedTouches[j].identifier) {
        touches[i].x = e.changedTouches[j].pageX;
        touches[i].y = e.changedTouches[j].pageY;
        break;
      }
    }
  }

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
    
    // panning
    let midX = (x1 + x2)/2;
    let midY = (y1 + y2)/2;

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

function touchUpdateHandler() {
  if (touches.length >= 2 && lastTouches.length >= 2) {
    let touch1 = touches[0];
    let lastTouch1 = lastTouches[0];
    let touch2 = touches[1];
    let lastTouch2 = lastTouches[1];

    // zooming
    let vx1 = touch1.x - lastTouch1.x;
    let vy1 = touch1.y - lastTouch1.y;
    let len1 = Math.sqrt(vx1 * vx1 + vy1 * vy1);
    vx1 /= len1;
    vy1 /= len1;

    let vx2 = touch2.x - lastTouch2.x;
    let vy2 = touch2.y - lastTouch2.y;
    let len2 = Math.sqrt(vx2 * vx2 + vy2 * vy2);
    vx2 /= len2;
    vy2 /= len2;

    let dot = vx1 * vx2 + vy1 * vy2;
    if (dot <= 0) {
      let dx = touch1.x - touch2.x;
      let dy = touch1.y - touch2.y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      let lastDx = lastTouch1.x - lastTouch2.x;
      let lastDy = lastTouch1.y - lastTouch2.y;
      let lastDistance = Math.sqrt(lastDx * lastDx + lastDy * lastDy);

      let distanceDiff = distance - lastDistance;
      scale = Math.min(1, Math.max(0.1, scale + distanceDiff * 0.002));
    }
  }

  lastTouches = [];
  for (let i = 0; i < touches.length; i++) {
    lastTouches[i] = {};
    lastTouches[i].id = touches[i].id;
    lastTouches[i].x = touches[i].x;
    lastTouches[i].y = touches[i].y;
  }

  if (touches.length == 0 && doPushHistory && Date.now() - lastTouchTime > 100) {
    pushHistory();
    doPushHistory = false;
  }

  window.requestAnimationFrame(touchUpdateHandler);
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
  mainCanvas.addEventListener('touchcancel', touchEndEventHandler);

  window.requestAnimationFrame(touchUpdateHandler);

  touchstartEventHandler(e);
}

function windowResizeHandler(e) {
  rebuildMainCanvas();
  redraw();
}

function blurHandler(e) {
  touches = [];
  lastTouches = [];
}

window.addEventListener("load", () => {
  mainCanvas.addEventListener('mousedown', mouseWins);
  mainCanvas.addEventListener('touchstart', touchWins);
  window.addEventListener("resize", windowResizeHandler);
  window.addEventListener("blur", blurHandler);
  rebuildDrawCanvas(mainCanvas.width, mainCanvas.height);
});