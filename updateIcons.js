const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

async function updateAllIcons() {
  try {
    const logoPath = path.join(__dirname, 'assets', 'Logo.png');
    const webLogoPath = path.join(__dirname, 'assets', 'logo-web.png');
    if (!fs.existsSync(logoPath)) {
      console.error('assets/Logo.png does not exist');
      return;
    }

    console.log('Reading assets/Logo.png...');
    const logo = await Jimp.read(logoPath);

    // 1. App icon (1024x1024)
    const icon1024 = logo.clone().resize(1024, 1024);
    await icon1024.writeAsync(path.join(__dirname, 'assets', 'icon.png'));
    await icon1024.writeAsync(path.join(__dirname, 'assets', 'android-icon-foreground.png'));
    console.log('Updated assets/icon.png & android-icon-foreground.png (1024x1024)');

    // 2. Favicon (192x192) — generado desde logo-web.png (pestaña web)
    if (!fs.existsSync(webLogoPath)) {
      console.error('assets/logo-web.png does not exist');
      return;
    }
    console.log('Reading assets/logo-web.png...');
    const webLogo = await Jimp.read(webLogoPath);
    const favicon192 = webLogo.clone().resize(192, 192);
    await favicon192.writeAsync(path.join(__dirname, 'assets', 'favicon.png'));
    console.log('Updated assets/favicon.png (192x192) from logo-web.png');

    // If dist folder exists, update dist icons as well
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      await favicon192.writeAsync(path.join(distPath, 'favicon.ico'));
      const distFaviconPng = path.join(distPath, 'assets', 'favicon.png');
      if (fs.existsSync(path.dirname(distFaviconPng))) {
        await favicon192.writeAsync(distFaviconPng);
      }
      console.log('Updated dist/favicon.ico');
    }

    // 3. Splash icon (512x512)
    const splash512 = logo.clone().resize(512, 512);
    await splash512.writeAsync(path.join(__dirname, 'assets', 'splash-icon.png'));
    console.log('Updated assets/splash-icon.png (512x512)');

    console.log('All icons updated successfully from logo.png!');
  } catch (err) {
    console.error('Error updating icons:', err);
  }
}

updateAllIcons();

