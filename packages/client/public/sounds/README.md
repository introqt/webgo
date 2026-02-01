# Sound Files Placeholder

This directory contains sound effect files for the WebGo game.

## Required Files:
- `stone-place.mp3` - Sound when placing a stone on the board
- `stone-capture.mp3` - Sound when stones are captured
- `victory.mp3` - Sound when game ends

## How to Add Sounds:

1. Download royalty-free sounds from:
   - https://freesound.org/
   - https://pixabay.com/sound-effects/
   - https://zapsplat.com/

2. Place MP3 files in this directory with the exact names above

3. Recommended characteristics:
   - Format: MP3
   - Size: < 100KB per file
   - Duration: 0.5-2 seconds
   - Volume: Normalized to consistent levels

## Temporary Note:
The application will gracefully handle missing sound files by logging warnings to console.
Once you add the MP3 files here, they will be automatically loaded and played.
