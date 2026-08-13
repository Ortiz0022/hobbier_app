const Jimp = require('jimp');

async function resizeIcon() {
  try {
    const image = await Jimp.read('assets/icon.png');
    
    // Expo requires exactly 1024x1024
    image.resize(1024, 1024);
    
    await image.writeAsync('assets/icon.png');
    console.log('Successfully resized assets/icon.png to 1024x1024');
  } catch (err) {
    console.error('Error processing image:', err);
  }
}

resizeIcon();
