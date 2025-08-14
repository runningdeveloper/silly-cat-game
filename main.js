import "./style.css";
import {
  init,
  Sprite,
  GameLoop,
  SpriteSheet,
  load,
  imageAssets,
  setImagePath,
} from "kontra";

let { canvas } = init();

// Set image path based on environment (production vs development)
const imagePath = import.meta.env.PROD ? "/silly-cat-game/images/" : "/images/";
console.log("Image path set to:", imagePath);
setImagePath(imagePath);

load("eyes4.png").then(function () {
  // Game settings
  const NUM_CATS = 10; // Configurable number of cats
  const EYE_SCALE = 0.4; // Scale factor for eye sprites
  const EYE_SPRITE_WIDTH = 136; // Width of each eye frame
  const EYE_SPRITE_HEIGHT = 82; // Height of each eye frame
  let eyeSprites = [];
  let catBodies = [];
  let catData = []; // Store data about each cat (eye side, etc.)

  // Scoring system
  let score = 0;
  let clicksRemaining = NUM_CATS;
  let gameActive = false; // Only allow scoring after cats turn black

  // Visual feedback system
  let screenFlashColor = null;
  let flashDuration = 0;
  const FLASH_TIME = 300; // Flash for 300ms

  // Movement control variables
  let isMoving = true;
  const movementDuration = 5000; // 5 seconds in milliseconds
  const colorChangeDuration = 3000; // 3 seconds in milliseconds (less than movement)

  let eyeSpriteSheet = SpriteSheet({
    image: imageAssets.eyes4,
    frameWidth: EYE_SPRITE_WIDTH,
    frameHeight: EYE_SPRITE_HEIGHT,
    animations: {
      // create a named animation: move
      move: {
        frames: "0..3", // frames 0 through 12
        frameRate: 2,
      },
    },
  });

  // Change body color to black after shorter time
  setTimeout(() => {
    catBodies.forEach((body) => {
      body.color = "black";
    });

    // Randomize eye positions after bodies turn black
    catData.forEach((cat) => {
      // Generate new random eye side
      const newEyeSide = Math.random() < 0.5 ? -1 : 1; // -1 for left, 1 for right
      cat.eyeSide = newEyeSide;

      // Calculate new eye offset
      cat.eyeOffsetX = (cat.bodyWidth / 4) * newEyeSide;

      // Update eye position immediately
      cat.eye.x = cat.body.x + cat.eyeOffsetX;
      cat.eye.y = cat.body.y + cat.eyeOffsetY;
    });

    console.log(
      "Cat bodies changed to black and eye positions randomized! Try to click the side without eyes!"
    );
    // Don't activate game here anymore - wait for movement to stop
  }, colorChangeDuration);

  // Stop movement after set time
  setTimeout(() => {
    isMoving = false;
    gameActive = true; // Enable scoring when movement stops
    console.log(
      "Cats have stopped moving! Game is now active - start clicking!"
    );
  }, movementDuration);

  for (let i = 0; i < NUM_CATS; i++) {
    // Calculate the scaled sprite dimensions
    const spriteWidth = EYE_SPRITE_WIDTH * EYE_SCALE; // frameWidth * scaleX
    const spriteHeight = EYE_SPRITE_HEIGHT * EYE_SCALE; // frameHeight * scaleY

    // Define cat body dimensions
    const bodyWidth = 100;
    const bodyHeight = 60;
    const padding = 20; // Minimum distance between cats

    // Calculate safe positioning boundaries (considering anchor point is center)
    // Need to account for both eye and body positions
    const minX = Math.max(spriteWidth / 2, bodyWidth / 2) + padding;
    const maxX =
      canvas.width - Math.max(spriteWidth / 2, bodyWidth / 2) - padding;
    const minY = spriteHeight / 2 + padding;
    const maxY =
      canvas.height - spriteHeight / 2 - bodyHeight / 2 - 10 - padding; // 10px gap between eye and body

    // Function to check if position overlaps with existing cats
    function isPositionValid(x, y) {
      for (let j = 0; j < catBodies.length; j++) {
        const existingCat = catBodies[j];
        const distance = Math.sqrt(
          Math.pow(x - existingCat.x, 2) + Math.pow(y - existingCat.y, 2)
        );
        const minDistance = (bodyWidth + bodyHeight) / 2 + padding; // Average size plus padding
        if (distance < minDistance) {
          return false;
        }
      }
      return true;
    }

    // Try to find a valid position (with fallback)
    let catX, catY;
    let attempts = 0;
    const maxAttempts = 50;

    do {
      catX = Math.random() * (maxX - minX) + minX;
      catY =
        Math.random() * (maxY - minY) +
        minY +
        spriteHeight / 2 +
        bodyHeight / 2 +
        10;
      attempts++;
    } while (!isPositionValid(catX, catY) && attempts < maxAttempts);

    // Create cat body first
    let catBody = Sprite({
      x: catX,
      y: catY,
      color: "orange",
      width: bodyWidth,
      height: bodyHeight,
      anchor: {
        x: 0.5,
        y: 0.5,
      },
      // Add random movement velocity
      dx: (Math.random() - 0.5) * 2, // Random horizontal velocity between -1 and 1
      dy: (Math.random() - 0.5) * 2, // Random vertical velocity between -1 and 1
    });

    // Position eyes on random side of the body (left or right)
    let eyeSide = Math.random() < 0.5 ? -1 : 1; // -1 for left, 1 for right
    let eyeOffsetX = (bodyWidth / 4) * eyeSide; // Position eyes on left or right side of body
    let eyeOffsetY = -bodyHeight / 4; // Position eyes on the upper part of the body

    let sprite = Sprite({
      x: catBody.x + eyeOffsetX,
      y: catBody.y + eyeOffsetY,
      anchor: {
        x: 0.5,
        y: 0.5,
      },
      scaleX: EYE_SCALE,
      scaleY: EYE_SCALE,

      // use the sprite sheet animations for the sprite
      animations: eyeSpriteSheet.animations,
    });

    // Start the animation
    sprite.playAnimation("move");

    // Set a random starting frame (0-3 since we have frames 0..3)
    sprite.currentAnimation.frame = Math.floor(Math.random() * 4);

    eyeSprites.push(sprite);
    catBodies.push(catBody);

    // Store cat data for click detection
    catData.push({
      body: catBody,
      eye: sprite,
      eyeSide: eyeSide,
      bodyWidth: bodyWidth,
      bodyHeight: bodyHeight,
      eyeOffsetX: eyeOffsetX,
      eyeOffsetY: eyeOffsetY,
    });
  }

  // Add click event listener to canvas
  canvas.addEventListener("click", function (event) {
    // Only allow clicks when game is active and clicks remaining
    if (!gameActive || clicksRemaining <= 0) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    let hitCat = false;

    // Check each cat
    catData.forEach((cat, index) => {
      const body = cat.body;
      const eyeSide = cat.eyeSide;

      // Check if click is within the cat body bounds
      const bodyLeft = body.x - cat.bodyWidth / 2;
      const bodyRight = body.x + cat.bodyWidth / 2;
      const bodyTop = body.y - cat.bodyHeight / 2;
      const bodyBottom = body.y + cat.bodyHeight / 2;

      if (
        clickX >= bodyLeft &&
        clickX <= bodyRight &&
        clickY >= bodyTop &&
        clickY <= bodyBottom
      ) {
        hitCat = true;
        // Determine which side of the body was clicked
        const clickSide = clickX < body.x ? -1 : 1; // -1 for left, 1 for right

        // Only register click if it's on the opposite side from the eyes
        if (clickSide !== eyeSide) {
          score += 1;
          // Flash green for success
          screenFlashColor = "rgba(0, 255, 0, 0.3)";
          flashDuration = FLASH_TIME;
          console.log(
            `Correct! Clicked cat ${
              index + 1
            } on the side without eyes! Score: ${score}`
          );
        } else {
          // Flash red for wrong side but don't subtract points
          screenFlashColor = "rgba(255, 0, 0, 0.3)";
          flashDuration = FLASH_TIME;
          console.log(
            `Wrong side! You clicked the eye side of cat ${
              index + 1
            }. Score: ${score}`
          );
        }
      }
    });

    // If no cat was hit, flash red but don't subtract points
    if (!hitCat) {
      // Flash red for miss
      screenFlashColor = "rgba(255, 0, 0, 0.3)";
      flashDuration = FLASH_TIME;
      console.log(`Missed! No cat clicked. Score: ${score}`);
    }

    // Decrease remaining clicks
    clicksRemaining--;

    // Check if game is over
    if (clicksRemaining <= 0) {
      console.log(`Game Over! Final Score: ${score}/${NUM_CATS}`);
      alert(`Game Over! Final Score: ${score}/${NUM_CATS}`);
      gameActive = false;
    }
  });

  let loop = GameLoop({
    // create the main game loop
    update: function () {
      // update all eye sprites
      eyeSprites.forEach((sprite) => {
        sprite.update();
      });

      // Update flash duration
      if (flashDuration > 0) {
        flashDuration -= 16; // Approximately 60fps, so 16ms per frame
        if (flashDuration <= 0) {
          screenFlashColor = null;
        }
      }

      // Move cats only if movement is active
      if (isMoving) {
        catData.forEach((cat, index) => {
          const body = cat.body;
          const eye = cat.eye;

          // Check for collisions with other cats and apply repulsion
          catData.forEach((otherCat, otherIndex) => {
            if (index !== otherIndex) {
              const otherBody = otherCat.body;
              const dx = body.x - otherBody.x;
              const dy = body.y - otherBody.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const minDistance = (cat.bodyWidth + otherCat.bodyWidth) / 2 + 20; // 20px padding

              if (distance < minDistance && distance > 0) {
                // Apply repulsion force
                const force = 0.5;
                const repulsionX = (dx / distance) * force;
                const repulsionY = (dy / distance) * force;

                body.dx += repulsionX;
                body.dy += repulsionY;

                // Limit velocity to prevent cats from moving too fast
                const maxVelocity = 3;
                body.dx = Math.max(
                  -maxVelocity,
                  Math.min(maxVelocity, body.dx)
                );
                body.dy = Math.max(
                  -maxVelocity,
                  Math.min(maxVelocity, body.dy)
                );
              }
            }
          });

          // Update body position
          body.x += body.dx;
          body.y += body.dy;

          // Add some friction to gradually slow down cats
          body.dx *= 0.98;
          body.dy *= 0.98;

          // Bounce off walls
          if (
            body.x <= cat.bodyWidth / 2 ||
            body.x >= canvas.width - cat.bodyWidth / 2
          ) {
            body.dx = -body.dx;
          }
          if (
            body.y <= cat.bodyHeight / 2 ||
            body.y >= canvas.height - cat.bodyHeight / 2
          ) {
            body.dy = -body.dy;
          }

          // Keep body within bounds
          body.x = Math.max(
            cat.bodyWidth / 2,
            Math.min(canvas.width - cat.bodyWidth / 2, body.x)
          );
          body.y = Math.max(
            cat.bodyHeight / 2,
            Math.min(canvas.height - cat.bodyHeight / 2, body.y)
          );

          // Update eye position to follow the body
          eye.x = body.x + cat.eyeOffsetX;
          eye.y = body.y + cat.eyeOffsetY;
        });
      }
    },
    render: function () {
      // render the game state

      // render all cat bodies first (so they appear behind the eyes)
      catBodies.forEach((body) => {
        body.render();
      });

      // render all eye sprites on top
      eyeSprites.forEach((sprite) => {
        sprite.render();
      });

      // Render score in bottom right corner
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white";
      ctx.font = "20px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`Score: ${score}`, canvas.width - 10, canvas.height - 30);
      ctx.fillText(
        `Clicks: ${clicksRemaining}`,
        canvas.width - 10,
        canvas.height - 10
      );

      // Render screen flash overlay
      if (screenFlashColor) {
        ctx.fillStyle = screenFlashColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    },
  });

  loop.start(); // start the game
});
