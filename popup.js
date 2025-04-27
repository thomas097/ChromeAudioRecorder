let isRecording = false;
let mediaRecorder;
let recordedChunks = [];
let timerInterval;
let secondsElapsed = 0;
let audioCtx;
let mediaStreamSource;
let playbackStream;

document.getElementById('recordButton').addEventListener('click', async () => {
  const button = document.getElementById('recordButton');
  const timer = document.getElementById('timer');

  if (!isRecording) {
    // Start recording
    chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
      if (!stream) {
        alert('Error capturing tab audio.');
        return;
      }

      // Create an AudioContext for playback
      audioCtx = new AudioContext();

      // Create a media stream source node to play audio
      mediaStreamSource = audioCtx.createMediaStreamSource(stream);
      
      // Create a new destination for the audio (output to speakers)
      playbackStream = audioCtx.createMediaStreamDestination();
      mediaStreamSource.connect(playbackStream);

      // Play audio from the speakers
      const audioElement = new Audio();
      audioElement.srcObject = playbackStream.stream;
      audioElement.play();

      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = function (e) {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = async function () {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });

        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const wavBlob = audioBufferToWav(audioBuffer);

        const url = URL.createObjectURL(wavBlob);
        const filename = await generateFilename();

        chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: false
        }, () => {
          showNotification('Recording saved!', filename);
        });

        recordedChunks = [];
      };

      mediaRecorder.start();
      isRecording = true;

      // Change button appearance
      button.textContent = 'Recording...';
      button.classList.add('recording');

      // Start timer
      secondsElapsed = 0;
      timer.textContent = '00:00';
      timerInterval = setInterval(() => {
        secondsElapsed++;
        timer.textContent = formatTime(secondsElapsed);
      }, 1000);
    });
  } else {
    // Stop recording
    mediaRecorder.stop();
    isRecording = false;

    // Reset button appearance
    button.textContent = 'Record now';
    button.classList.remove('recording');

    // Stop timer
    clearInterval(timerInterval);

    // Stop audio playback
    playbackStream.disconnect();
  }
});

// Helper: Convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);

  // RIFF chunk descriptor
  writeUTFBytes(view, 0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * numOfChan * 2, true);
  writeUTFBytes(view, 8, 'WAVE');

  // FMT sub-chunk
  writeUTFBytes(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numOfChan * 2, true);
  view.setUint16(32, numOfChan * 2, true);
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  writeUTFBytes(view, 36, 'data');
  view.setUint32(40, buffer.length * numOfChan * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      let sample = buffer.getChannelData(channel)[i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeUTFBytes(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Helper: Format seconds into mm:ss
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// Helper: Generate smart filename
function generateFilename() {
  return getTabTitle().then(tabTitle => {
    return `Recording_${tabTitle}.wav`;
  });
}

function getTabTitle() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getTabTitle' }, (response) => {
      if (response && response.tabTitle) {
        resolve(response.tabTitle); // Resolve with the tab title
      } else {
        reject('Tab title not found');
      }
    });
  });
}

// Helper: Show notification
function showNotification(title, message) {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png', // optional: put a small icon file in your folder
      title: title,
      message: message
    });
  } else {
    alert(`${title}\n${message}`);
  }
}
