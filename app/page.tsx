"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import MidiPlayer from 'midi-player-js';
import Soundfont from 'soundfont-player';

export default function HomePage() {
  // Refs for AudioContext, instrument, and player
  const audioCtxRef = useRef<AudioContext | null>(null);
  const instrumentRef = useRef<any>(null);
  const playerRef = useRef<MidiPlayer.Player | null>(null);

  // UI state
  const [soundfontLoading, setSoundfontLoading] = useState(true);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [fileFormat, setFileFormat] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Initialize AudioContext and load SoundFont instrument on mount
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        // Resume AudioContext if it's suspended (required by some browsers)
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        // Load a piano (acoustic_grand_piano) SoundFont
        const instrument = await Soundfont.instrument(audioCtx, 'acoustic_grand_piano');
        instrumentRef.current = instrument;

        // Initialize MIDI Player and set up event handler for MIDI events
        const player = new MidiPlayer.Player((event: any) => {
          if (!instrumentRef.current || !audioCtxRef.current) return;
          
          if (event.name === 'Note on' && event.velocity > 0) {
            // Note on: play the note
            instrumentRef.current.play(event.noteName, audioCtxRef.current.currentTime, { 
              gain: event.velocity / 127 
            });
          } else if ((event.name === 'Note on' && event.velocity === 0) || event.name === 'Note off') {
            // Note off (or Note on with velocity 0): stop the note
            instrumentRef.current.stop(event.noteName, audioCtxRef.current.currentTime);
          }
        });

        // Attach event listeners to the player
        player.on('endOfFile', () => {
          setIsPlaying(false);
          setProgress(100);
        });

        player.on('fileLoaded', () => {
          try {
            // @ts-ignore: getFormat() might not be in type definitions
            const format = player.getFormat ? player.getFormat() : null;
            setFileFormat(format);
          } catch {
            setFileFormat(null);
          }
          setTempo(120);
          setFileLoaded(true);
          setProgress(0);
          setError('');
        });

        playerRef.current = player;
        setSoundfontLoading(false);
        setError('');
      } catch (err) {
        console.error('Failed to initialize audio:', err);
        setError('Failed to initialize audio. Please refresh the page and try again.');
        setSoundfontLoading(false);
      }
    };

    initializeAudio();

    // Cleanup: close AudioContext on unmount
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Effect: update progress bar while playing
  useEffect(() => {
    if (!playerRef.current) return;
    
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        const player = playerRef.current;
        if (player && player.isPlaying()) {
          try {
            const remaining = player.getSongPercentRemaining();
            const completed = 100 - (typeof remaining === 'number' ? remaining : 0);
            setProgress(Math.max(0, Math.min(100, completed)));
          } catch (err) {
            console.error('Error getting progress:', err);
          }
        }
      }, 100);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying]);

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !playerRef.current) return;

    // Validate file type
    if (!file.name.toLowerCase().match(/\.(mid|midi)$/)) {
      setError('Please select a valid MIDI file (.mid or .midi)');
      return;
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Please select a file smaller than 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result;
      if (!arrayBuffer || !playerRef.current) return;

      try {
        playerRef.current.stop();
        setIsPlaying(false);
        setProgress(0);
        
        playerRef.current.loadArrayBuffer(arrayBuffer);
        setFileName(file.name);
        setError('');
      } catch (err) {
        console.error('Error loading MIDI file:', err);
        setError('Failed to load MIDI file. Please try a different file.');
        setFileLoaded(false);
        setFileName('');
      }
    };

    reader.onerror = () => {
      setError('Failed to read the file. Please try again.');
    };

    reader.readAsArrayBuffer(file);
  }, []);

  // Play/Pause toggle
  const handlePlayPause = useCallback(async () => {
    if (!playerRef.current || !audioCtxRef.current) return;

    try {
      // Resume AudioContext if suspended
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      if (isPlaying) {
        playerRef.current.pause();
        setIsPlaying(false);
      } else {
        playerRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error during play/pause:', err);
      setError('Playback error occurred. Please try again.');
    }
  }, [isPlaying]);

  // Stop playback
  const handleStop = useCallback(() => {
    if (!playerRef.current) return;
    
    try {
      playerRef.current.stop();
      setIsPlaying(false);
      setProgress(0);
    } catch (err) {
      console.error('Error stopping playback:', err);
    }
  }, []);

  // Tempo slider change
  const handleTempoChange = useCallback((newTempo: number) => {
    if (!playerRef.current) return;
    
    try {
      const wasPlaying = isPlaying;
      if (wasPlaying) {
        playerRef.current.pause();
      }
      
      playerRef.current.setTempo(newTempo);
      setTempo(newTempo);
      
      if (wasPlaying) {
        playerRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error changing tempo:', err);
      setError('Failed to change tempo. Please try again.');
    }
  }, [isPlaying]);

  return (
    <main className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">🎹 MIDI Player Pro</h1>
        <p className="text-gray-600 leading-relaxed">
          Upload and play your MIDI files with our advanced web-based player. 
          Built with <a href="https://github.com/grimmdude/MidiPlayerJS" className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noreferrer">MidiPlayerJS</a> and <a href="https://github.com/danigb/soundfont-player" className=\"text-blue-600 hover:text-blue-800 underline" target=\"_blank" rel="noreferrer">soundfont-player</a>.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* File Upload Section */}
      <div className="mb-6">
        <h4 className="text-xl font-semibold mb-3 text-gray-700">Choose a MIDI File</h4>
        {soundfontLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading soundfont...</span>
          </div>
        ) : (
          <div className="space-y-3">
            <input 
              type="file" 
              accept=".mid,.midi" 
              onChange={handleFileChange} 
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {fileName && (
              <p className="text-sm text-gray-600">
                <strong>Loaded:</strong> {fileName}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 transition-all duration-200 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>{Math.round(progress)}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6">
        <div className="flex justify-center space-x-3">
          <button 
            onClick={handlePlayPause} 
            disabled={!fileLoaded || soundfontLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <span>{isPlaying ? '⏸️' : '▶️'}</span>
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <button 
            onClick={handleStop} 
            disabled={!fileLoaded}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <span>⏹️</span>
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* Tempo Control */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Tempo</label>
          <span className="text-lg font-semibold text-blue-600">{tempo} BPM</span>
        </div>
        <input 
          type="range" 
          min="50" 
          max="200" 
          step="5"
          value={tempo} 
          onChange={(e) => handleTempoChange(Number(e.target.value))} 
          disabled={!fileLoaded}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>50 BPM</span>
          <span>200 BPM</span>
        </div>
      </div>

      {/* File Info */}
      {fileLoaded && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h5 className="font-semibold text-blue-800 mb-2">File Information</h5>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Format:</strong> {fileFormat !== null ? `Type ${fileFormat}` : 'Unknown'}</p>
            <p><strong>Current Tempo:</strong> {tempo} BPM</p>
            <p><strong>Status:</strong> {isPlaying ? 'Playing' : 'Stopped'}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!fileLoaded && !soundfontLoading && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-6xl mb-4">🎵</div>
          <p className="text-lg">Upload a MIDI file to get started!</p>
          <p className="text-sm mt-2">Supported formats: .mid, .midi</p>
        </div>
      )}

      <footer className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
        <p>
          Original concept by <a href="http://grimmdude.com" className="text-blue-600 hover:text-blue-800 underline">Garrett Grimm</a>
        </p>
      </footer>
    </main>
  );
}