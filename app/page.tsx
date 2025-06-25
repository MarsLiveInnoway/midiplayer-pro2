"use client";

import { useEffect, useRef, useState } from 'react';
import MidiPlayer from 'midi-player-js';
import Soundfont from 'soundfont-player';

export default function HomePage() {
  // Refs for AudioContext, instrument, and player
  const audioCtxRef = useRef<AudioContext | null>(null);
  const instrumentRef = useRef<any>(null);
  const playerRef = useRef<any>(null);

  // UI state
  const [soundfontLoading, setSoundfontLoading] = useState(true);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [fileFormat, setFileFormat] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  // Initialize AudioContext and load SoundFont instrument on mount
  useEffect(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    // Load a piano (acoustic_grand_piano) SoundFont
    Soundfont.instrument(audioCtx, 'acoustic_grand_piano').then(instrument => {
      instrumentRef.current = instrument;
      // Initialize MIDI Player and set up event handler for MIDI events
      const player = new MidiPlayer.Player((event: any) => {
        if (!instrumentRef.current) return;
        if (event.name === 'Note on' && event.velocity > 0) {
          // Note on: play the note
          instrumentRef.current.play(event.noteName, audioCtx.currentTime, { gain: 1 });
        } else if ((event.name === 'Note on' && event.velocity === 0) || event.name === 'Note off') {
          // Note off (or Note on with velocity 0): stop the note
          instrumentRef.current.stop(event.noteName, audioCtx.currentTime);
        }
      });
      // Attach event listeners to the player
      player.on('endOfFile', () => {
        // MIDI playback ended
        setIsPlaying(false);
        setProgress(0);
      });
      player.on('fileLoaded', () => {
        // MIDI file successfully loaded
        try {
          // Retrieve MIDI file format (0,1,2)
          // @ts-ignore: getFormat() is not in type definitions
          setFileFormat(player.getFormat());
        } catch {
          setFileFormat(null);
        }
        setTempo(120);
        setFileLoaded(true);
        setProgress(0);
      });
      playerRef.current = player;
      setSoundfontLoading(false);
    });
    // Cleanup: close AudioContext on unmount
    return () => {
      audioCtx.close();
    };
  }, []);

  // Effect: update progress bar while playing
  useEffect(() => {
    if (!playerRef.current) return;
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        const player = playerRef.current;
        const remaining = player.getSongPercentRemaining();
        const completed = 100 - (typeof remaining === 'number' ? remaining : 0);
        setProgress(completed);
      }, 200);
    }
    return () => {
      clearInterval(interval);
    };
  }, [isPlaying]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && playerRef.current) {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        if (!arrayBuffer) return;
        playerRef.current.stop();               // stop current playback (if any)
        playerRef.current.loadArrayBuffer(arrayBuffer); // load new MIDI file
        // After loading, 'fileLoaded' event will fire and update state
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Play/Pause toggle
  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  };

  // Stop playback
  const handleStop = () => {
    if (!playerRef.current) return;
    playerRef.current.stop();
    setIsPlaying(false);
    setProgress(0);
  };

  // Tempo slider change
  const handleTempoChange = (newTempo: number) => {
    if (!playerRef.current) return;
    playerRef.current.pause();
    playerRef.current.setTempo(newTempo);
    playerRef.current.play();
    setTempo(newTempo);
    setIsPlaying(true);
  };

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">♬ MidiPlayerJS</h1>
      <p className="mb-4">
        MidiPlayerJS is a JavaScript library which triggers events in sequence with a given MIDI file.
        This MIDI player was built using <a href="https://github.com/grimmdude/MidiPlayerJS" className="text-blue-600 underline" target="_blank" rel="noreferrer">MidiPlayerJS</a> to read the file, and <a href="https://github.com/danigb/soundfont-player" className="text-blue-600 underline" target="_blank" rel="noreferrer">soundfont-player</a> to load and play the sounds.
      </p>
      <h4 className="text-lg font-semibold mb-2">Choose a Midi File</h4>
      {soundfontLoading ? (
        <p id="loading" className="mb-4">Loading soundfont...</p>
      ) : (
        <div className="mb-4">
          <input 
            type="file" 
            accept=".mid,.midi" 
            onChange={handleFileChange} 
            className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-gray-200"
          />
        </div>
      )}
      {/* Progress bar */}
      <div className="border border-gray-400 bg-gray-100 h-5 mb-4">
        <div id="play-bar" className="bg-blue-500 h-5" style={{ width: `${progress}%` }}></div>
      </div>
      {/* Controls */}
      <div className="mb-4 space-x-2">
        <button 
          id="play-button" 
          onClick={handlePlayPause} 
          disabled={!fileLoaded}
          className="bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:bg-gray-400"
        >
          Play
        </button>
        <button 
          onClick={handleStop} 
          className="bg-gray-500 text-white font-semibold py-2 px-4 rounded"
        >
          Stop
        </button>
      </div>
      {/* Tempo slider */}
      <p className="mb-2">
        Tempo: <span id="tempo-display">{tempo}</span> bpm
      </p>
      <input 
        type="range" 
        min="50" max="200" 
        value={tempo} 
        onChange={(e) => handleTempoChange(Number(e.target.value))} 
        className="w-52"
      />
      <p className="mt-4">
        MIDI File Format: <span id="file-format-display">{fileFormat !== null ? fileFormat : ''}</span>
      </p>
      <p className="mt-8 text-sm text-gray-600">
        By <a href="http://grimmdude.com" className="underline">Garrett Grimm</a>
      </p>
    </main>
  );
}
