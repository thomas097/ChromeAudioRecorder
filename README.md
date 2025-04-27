# Audio Recorder extension for Google Chrome
Barebones audio recorder extension for Google Chrome - that's it...

# Usage

- Open Chrome browser
- Go to `chrome://extensions/`
- Upload folder with `Load Unpacked` option.
- (Optional) Pin extension to taskbar.
- Click on the extension in the task bar and press "Record".
    - The file is saved as a WAV file when the button is pressed again.

Tip: As chrome extensions are disabled when they lose focus, the recording is stopped when you interact again with the webpage. An easy way to fix is its to open the inspector, available by right clicking on the extension pop-up. The inspector will force the extension to remain active, allowing you to freely start/stop content on the main page.
