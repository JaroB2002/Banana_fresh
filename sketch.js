let canvas;
let video;
let button;
let poseNet;
let pose;
let skeleton;
let applyFilter = 'none';
let filterButtons = [];
let banImaga = {};
let capturedImage = null;
let saveButton;
let cancelButton;
let capturing = true;
let classifier;
let imageModelURL = 'https://teachablemachine.withgoogle.com/models/uyxGKedmI/';
let flippedVideo;
let label = "";
let bananaImage;
let faceWidth = 0;
let timerStarted = false;
let startTime;
let captureDelay = 10000; // Delay van 10 seconden

let score = 0;
let scoreButton;

let timerPaused = false;
let pauseButton;

let sound;
let soundPlayed = false;

function preload() {
  banImaga = {
    banana: loadImage('https://cdn.pixabay.com/photo/2018/06/14/13/38/bananas-3474872_1280.jpg'),
  };

  classifier = ml5.imageClassifier(imageModelURL + 'model.json');
  
  sound = loadSound('Sound.wav'); 
}

function setup() {
  canvas = createCanvas(440, 356);
  createButtons();

  video = createCapture(VIDEO);
  video.size(440, 360);
  video.hide();

  button = createButton('Take a picture');
  button.mousePressed(takePicture);

  poseNet = ml5.poseNet(video, modelLoaded);
  poseNet.on('pose', gotPoses);

  saveButton = createButton('Save');
  saveButton.mousePressed(saveImage);
  saveButton.hide();

  cancelButton = createButton('Cancel');
  cancelButton.mousePressed(cancelSave);
  cancelButton.hide();

  buttonsContainer = createDiv();
  buttonsContainer.style('display', 'flex');
  buttonsContainer.style('justify-content', 'center');
  buttonsContainer.style('margin-top', '10px');
  buttonsContainer.style('margin-bottom', '10px');

  saveButton.style('margin-right', '10px');
  cancelButton.style('margin-left', '10px');

  buttonsContainer.child(saveButton);
  buttonsContainer.child(cancelButton);

  classifyVideo();
  startCaptureTimer();
}

function draw() {
  background(0);
  if (capturing) {
    image(video, 0, 0, width, height);
    if (pose) {
      for (let i = 0; i < skeleton.length; i++) {
        let a = skeleton[i][0];
        let b = skeleton[i][1];
        strokeWeight(2);
        stroke(255);
        line(a.position.x, a.position.y, b.position.x, b.position.y);
      }

      if (applyFilter === 'banana') {
        let headWidth = pose.rightEar.x - pose.leftEar.x;
        bananaImage = banImaga.banana;
        let faceCenterX = pose.nose.x;
        let faceCenterY = pose.nose.y - headWidth / 2 + headWidth * 0.7; // Pas deze waarde aan om de banaan lager te plaatsen
        faceWidth = headWidth * 0.5;
        let faceHeight = faceWidth * (bananaImage.height / bananaImage.width);
        let bananaX = faceCenterX - faceWidth / 2;
        let bananaY = faceCenterY - faceHeight;
        imageMode(CORNER);
        image(bananaImage, bananaX, bananaY, faceWidth, faceHeight);
      }
    }

    if (capturedImage) {
      image(capturedImage, 0, 0, width, height);
    }
  }

  fill(255);
  textSize(16);
  textAlign(CENTER);
  text(label, width / 2, height - 4);
  
  text("Score: " + score, width / 2, 20);

  if (timerStarted && !timerPaused) {
    let currentTime = millis() - startTime;
    let remainingTime = captureDelay - currentTime;

    if (remainingTime > 0) {
      let countdown = ceil(remainingTime / 1000);
      fill(255);
      textSize(32);
      textAlign(CENTER);
      text(countdown, width / 2, height / 2);
    } else {
      takePicture();
      stopCaptureTimer();
    }
  }
}

function classifyVideo() {
  flippedVideo = ml5.flipImage(video);
  classifier.classify(flippedVideo, gotResult);
}

function gotResult(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  label = results[0].label;
  classifyVideo();
}

function createButtons() {
  // Create filter buttons
  for (let key in banImaga) {
    let filterButton = createButton(key);
    filterButton.style('margin-right', '10px');
    filterButton.style('padding', '8px 16px');
    filterButton.style('background-color', '#4CAF50');
    filterButton.style('border', 'none');
    filterButton.style('color', 'white');
    filterButton.style('text-align', 'center');
    filterButton.style('text-decoration', 'none');
    filterButton.style('display', 'inline-block');
    filterButton.style('font-size', '16px');
    filterButton.style('border-radius', '4px');
    filterButton.mousePressed(() => {
      applyFilter = key;
    });
    filterButtons.push(filterButton);
  }

  // Create 'Remove Banana' button
  let removeButton = createButton('Remove Banana');
  removeButton.style('margin-right', '10px');
  removeButton.style('padding', '8px 16px');
  removeButton.style('background-color', '#4CAF50');
  removeButton.style('border', 'none');
  removeButton.style('color', 'white');
  removeButton.style('text-align', 'center');
  removeButton.style('text-decoration', 'none');
  removeButton.style('display', 'inline-block');
  removeButton.style('font-size', '16px');
  removeButton.style('border-radius', '4px');
  removeButton.mousePressed(() => {
    applyFilter = 'none';
  });

  // Create 'Pause/Play Timer' button
  pauseButton = createButton('Pause Timer');
  pauseButton.style('margin-right', '10px');
  pauseButton.style('padding', '8px 16px');
  pauseButton.style('background-color', '#4CAF50');
  pauseButton.style('border', 'none');
  pauseButton.style('color', 'white');
  pauseButton.style('text-align', 'center');
  pauseButton.style('text-decoration', 'none');
  pauseButton.style('display', 'inline-block');
  pauseButton.style('font-size', '16px');
  pauseButton.style('border-radius', '4px');
  pauseButton.mousePressed(pauseTimer);

  // Create button container
  let buttonContainer = createDiv();
  buttonContainer.style('display', 'flex');
  buttonContainer.style('justify-content', 'center');
  buttonContainer.style('margin-bottom', '10px');

  // Add filter buttons, 'Remove Banana' button, and 'Pause/Play Timer' button to container
  for (let i = 0; i < filterButtons.length; i++) {
    buttonContainer.child(filterButtons[i]);
  }
  buttonContainer.child(removeButton);
  buttonContainer.child(pauseButton);

  // Add container to document
  document.body.appendChild(buttonContainer.elt);
}

function modelLoaded() {
  console.log("Model loaded!");
}

function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
    skeleton = poses[0].skeleton;
  }
}

function takePicture() {
  capturedImage = video.get();
  saveButton.show();
  cancelButton.show();
  capturing = false;
  
  // Increase score
  score++;
}

function saveImage() {
  save(capturedImage, 'myImage.png');
  capturedImage = null;
  saveButton.hide();
  cancelButton.hide();
  capturing = true;
}

function cancelSave() {
  capturedImage = null;
  saveButton.hide();
  cancelButton.hide();
  capturing = true;
}

function startCaptureTimer() {
  startTime = millis();
  timerStarted = true;
  timerPaused = false;
  pauseButton.html('Pause Timer');
}

function stopCaptureTimer() {
  timerStarted = false;
}

function pauseTimer() {
  timerPaused = !timerPaused;
  if (timerPaused) {
    pauseButton.html('Play Timer');
  } else {
    pauseButton.html('Pause Timer');
    startTime += millis() - pausedTime;
  }
  pausedTime = millis();
}
