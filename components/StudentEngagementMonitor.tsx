import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EngagementLevel, BehavioralEvent } from '../types';
import { BarChart3, TrendingUp, TrendingDown, Minus, Camera, CameraOff, Smile, Frown, Meh, Loader2, AlertTriangle, Cpu, ArrowLeft, ArrowRight, ArrowDown } from 'lucide-react';

declare const faceapi: any;

interface StudentEngagementMonitorProps {
  onEngagementChange: (level: EngagementLevel) => void;
}

const engagementConfig = {
    [EngagementLevel.HIGH]: {
      color: 'text-green-500 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/50',
      barColor: 'bg-green-500',
      icon: <TrendingUp className="h-5 w-5" />,
      text: "Excellent focus!",
      width: "100%"
    },
    [EngagementLevel.MEDIUM]: {
      color: 'text-yellow-500 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/50',
      barColor: 'bg-yellow-500',
      icon: <Minus className="h-5 w-5" />,
      text: "Good, let's stay focused.",
      width: "66%"
    },
    [EngagementLevel.LOW]: {
      color: 'text-red-500 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/50',
      barColor: 'bg-red-500',
      icon: <TrendingDown className="h-5 w-5" />,
      text: "Need a little boost?",
      width: "33%"
    }
};

const eventIcons: { [key: string]: React.ReactElement } = {
    Smile: <Smile size={14} className="text-green-500" />,
    Frown: <Frown size={14} className="text-red-500" />,
    Meh: <Meh size={14} className="text-yellow-500" />,
    ArrowLeft: <ArrowLeft size={14} className="text-red-500" />,
    ArrowRight: <ArrowRight size={14} className="text-red-500" />,
    ArrowDown: <ArrowDown size={14} className="text-red-500" />,
};

const possibleEvents: Omit<BehavioralEvent, 'timestamp'>[] = [
    { type: 'positive', description: "Positive expression detected", icon: 'Smile' },
    { type: 'neutral', description: "Focused on screen", icon: 'Meh' },
    { type: 'distracted', description: "Looking away from screen", icon: 'Frown' },
    { type: 'distracted', description: "Looking left", icon: 'ArrowLeft' },
    { type: 'distracted', description: "Looking right", icon: 'ArrowRight' },
    { type: 'distracted', description: "Looking down", icon: 'ArrowDown' },
    { type: 'positive', description: "Nodding in agreement", icon: 'Smile'},
];

type MonitorMode = 'loading' | 'realtime' | 'simulated' | 'idle';

const StudentEngagementMonitor: React.FC<StudentEngagementMonitorProps> = ({ onEngagementChange }) => {
  const [level, setLevel] = useState<EngagementLevel>(EngagementLevel.HIGH);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<BehavioralEvent[]>([]);
  const [monitorMode, setMonitorMode] = useState<MonitorMode>('loading');
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const loadModels = async () => {
        if (typeof faceapi === 'undefined') {
            console.warn("face-api.js not loaded yet, retrying...");
            setTimeout(loadModels, 200);
            return;
        }
        
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/weights';
        
        try {
            setLoadingMessage('Loading face detector model...');
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            
            setLoadingMessage('Loading landmark model...');
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

            setLoadingMessage('Loading expression model...');
            await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
            
            setMonitorMode('idle');
        } catch (error) {
            console.error("Failed to load face-api models:", error);
            setMonitorMode('simulated');
        }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError("Camera access was denied. Please enable it in your browser settings.");
      setIsCameraOn(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    const canvas = canvasRef.current;
    if(canvas) {
        const context = canvas.getContext('2d');
        if (context) context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const getHeadPoseEvent = (landmarks: any): BehavioralEvent | null => {
      const nose = landmarks.getNose()[3]; // Tip of the nose
      const leftEye = landmarks.getLeftEye()[0];
      const rightEye = landmarks.getRightEye()[3];
      const jawLeft = landmarks.getJawOutline()[1];
      const jawRight = landmarks.getJawOutline()[15];
      const chin = landmarks.getJawOutline()[8];
      const leftEyebrow = landmarks.getLeftEyeBrow()[2];

      const horizontalDistLeft = nose.x - jawLeft.x;
      const horizontalDistRight = jawRight.x - nose.x;
      const horizontalRatio = horizontalDistLeft / horizontalDistRight;

      const verticalDistUpper = nose.y - leftEyebrow.y;
      const verticalDistLower = chin.y - nose.y;
      const verticalRatio = verticalDistUpper / verticalDistLower;

      if (horizontalRatio > 1.8) return { type: 'distracted', description: 'Looking right', icon: 'ArrowRight', timestamp: Date.now() };
      if (horizontalRatio < 0.55) return { type: 'distracted', description: 'Looking left', icon: 'ArrowLeft', timestamp: Date.now() };
      if (verticalRatio < 0.8) return { type: 'distracted', description: 'Looking down', icon: 'ArrowDown', timestamp: Date.now() };

      return null;
  };

  const runRealtimeDetection = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 3 || monitorMode !== 'realtime') return;

    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })).withFaceLandmarks().withFaceExpressions();
   
    if (detections && detections.length > 0) {
        const { landmarks, expressions } = detections[0];
        let newEvent: BehavioralEvent | null = null;
        
        // Prioritize head pose as a stronger indicator of distraction
        newEvent = getHeadPoseEvent(landmarks);

        // If head pose is neutral, fall back to expressions
        if (!newEvent) {
            const dominantExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
            switch (dominantExpression) {
                case 'happy': newEvent = { type: 'positive', description: 'Positive expression detected', icon: 'Smile', timestamp: Date.now() }; break;
                case 'neutral': newEvent = { type: 'neutral', description: 'Neutral expression detected', icon: 'Meh', timestamp: Date.now() }; break;
                default: newEvent = { type: 'distracted', description: `${dominantExpression.charAt(0).toUpperCase() + dominantExpression.slice(1)} expression`, icon: 'Frown', timestamp: Date.now() };
            }
        }
        setEventLog(prevLog => [newEvent, ...prevLog.slice(0, 4)]);
    } else {
        const newEvent: BehavioralEvent = { type: 'distracted', description: "Looking away from screen", icon: 'Frown', timestamp: Date.now() };
        setEventLog(prevLog => [newEvent, ...prevLog.slice(0, 4)]);
    }
  }, [monitorMode]);
  
  const runSimulation = useCallback(() => {
    intervalRef.current = window.setInterval(() => {
        const randomEvent = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
        const newEvent: BehavioralEvent = { ...randomEvent, timestamp: Date.now() };
        setEventLog(prevLog => [newEvent, ...prevLog.slice(0, 4)]);
    }, 2000);
  }, []);

  const drawHud = useCallback(() => {
    const animate = async () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video || video.readyState < 3) {
            if (isCameraOn) animationFrameRef.current = requestAnimationFrame(animate);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { clientWidth: w, clientHeight: h } = video;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }

        ctx.clearRect(0, 0, w, h);
        
        if (monitorMode === 'realtime') {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })).withFaceLandmarks();
             if (detections && detections.length > 0) {
                const displaySize = { width: w, height: h };
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
             }
        } else if (monitorMode === 'simulated') {
            // Simulation drawing logic could go here if desired
        }
        
        if (isCameraOn) animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  }, [isCameraOn, monitorMode]);

  useEffect(() => {
    if (!isCameraOn) {
        stopCamera();
        return;
    }
    
    startCamera();

    if (monitorMode === 'realtime') {
        intervalRef.current = window.setInterval(runRealtimeDetection, 1500);
        drawHud();
    } else if (monitorMode === 'simulated') {
        runSimulation();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isCameraOn, monitorMode, runRealtimeDetection, runSimulation, drawHud]);

  useEffect(() => {
      if (!isCameraOn) { setLevel(EngagementLevel.HIGH); onEngagementChange(EngagementLevel.HIGH); return; }
      if (eventLog.length === 0) return;
      const scoreMap = { 'positive': 2, 'neutral': 1, 'distracted': 0 };
      const totalScore = eventLog.reduce((acc, event) => acc + scoreMap[event.type], 0);
      const averageScore = totalScore / eventLog.length;
      let newLevel: EngagementLevel;
      if (averageScore > 1.2) newLevel = EngagementLevel.HIGH;
      else if (averageScore > 0.6) newLevel = EngagementLevel.MEDIUM;
      else newLevel = EngagementLevel.LOW;
      setLevel(newLevel);
      onEngagementChange(newLevel);
  }, [eventLog, isCameraOn, onEngagementChange]);

  const toggleCamera = () => setIsCameraOn(prev => !prev);
  const config = engagementConfig[level];

  const renderCameraOverlay = () => {
    if (isCameraOn) return null;
    if (monitorMode === 'loading') return <><Loader2 className="h-10 w-10 mb-2 mx-auto text-gray-400 animate-spin"/><p className="text-sm font-medium text-gray-300">Loading AI Models</p><p className="text-xs text-gray-400 mt-1">{loadingMessage}</p></>;
    if (monitorMode === 'simulated') return <><AlertTriangle className="h-10 w-10 mb-2 mx-auto text-yellow-400"/><p className="text-sm font-medium text-yellow-400">Simulation Mode Active</p><p className="text-xs text-gray-400 mt-1 text-center">Real-time analysis failed. This can be caused by network settings. <strong className="font-bold">Try disabling ad-blockers for this site.</strong></p></>;
    return <><CameraOff className="h-10 w-10 mb-2 mx-auto text-gray-500"/><p className="text-sm font-medium text-gray-300">Camera is off</p>{cameraError ? <p className="text-xs text-red-400 mt-1 text-center">{cameraError}</p> : <p className="text-xs text-gray-400 mt-1">Enable for real-time expression and pose analysis.</p>}</>;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
            {monitorMode === 'simulated' ? <Cpu className="h-6 w-6 text-yellow-500"/> : <BarChart3 className="h-6 w-6 text-indigo-500" />}
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Engagement Monitor</h3>
            {monitorMode === 'simulated' && <span className="text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 px-2 py-0.5 rounded-full">Simulated</span>}
        </div>
         <button onClick={toggleCamera} disabled={monitorMode === 'loading'} className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-wait ${isCameraOn ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
          {isCameraOn ? <CameraOff size={14} /> : <Camera size={14} />}
          <span>{isCameraOn ? 'Cam Off' : 'Cam On'}</span>
        </button>
      </div>

       <div className="w-full aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center text-gray-400 mb-3 overflow-hidden relative">
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraOn ? 'opacity-100' : 'opacity-0'}`} onLoadedMetadata={() => videoRef.current?.play()}/>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            <div className='absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-black/50 transition-opacity' style={{opacity: isCameraOn ? 0 : 1}}>
                {renderCameraOverlay()}
            </div>
        </div>
      
      <div className="space-y-3">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full transition-all duration-500 ${config.barColor}`} style={{ width: config.width }}></div>
        </div>
        <div className={`flex items-center space-x-2 text-sm font-semibold ${config.color}`}>
          {config.icon}
          <span>{level} Engagement</span>
           <span className="text-xs text-gray-500 dark:text-gray-400 italic ml-auto">{config.text}</span>
        </div>

        <div className="h-[90px] bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 space-y-1 overflow-y-auto border dark:border-gray-600">
            <h4 className="text-xs font-bold text-gray-600 dark:text-gray-400 pb-1 border-b dark:border-gray-600">Behavioral Event Log {monitorMode === 'simulated' ? '(Simulated)' : '(Live)'}</h4>
            {eventLog.length > 0 ? (
                eventLog.map(event => (
                    <div key={event.timestamp} className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 animate-fade-in">
                        {eventIcons[event.icon]}
                        <span>{event.description}</span>
                        <span className="ml-auto text-gray-400 dark:text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>
                ))
            ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4">Event log is empty. Turn on camera.</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default StudentEngagementMonitor;