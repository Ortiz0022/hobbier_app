const Jimp = require('jimp');

async function processIcon() {
  try {
    const image = await Jimp.read('assets/nuevo_icono.jpeg');
    const w = image.bitmap.width;
    const h = image.bitmap.height;
    
    // Convert all white (or near-white) pixels to transparent
    image.scan(0, 0, w, h, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // If color is very close to white, make transparent
      if (red > 240 && green > 240 && blue > 240) {
        this.bitmap.data[idx + 3] = 0; // alpha to 0
      }
    });

    await image.writeAsync('assets/icon.png');
    console.log('Successfully created assets/icon.png');
  } catch (err) {
    console.error('Error processing image:', err);
  }
}

processIcon();
