// FIX: Removed erroneous file markers from the start and end of the file.
import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { MousePointer2, Pencil, Eraser, Type, Trash2, Undo2, Redo2, ImagePlus, Video, Circle, RectangleHorizontal, Minus, Play, Pause, StopCircle } from 'lucide-react';

declare const fabric: any;

const SmartWhiteboard = forwardRef((props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<any>(null);
    const isUnmounting = useRef(false); // Guard flag
    const resizeObserverRef = useRef<ResizeObserver | null>(null); // Ref for stable observer instance

    const [tool, setTool] = useState('select');
    const [color, setColor] = useState('#000000');
    const [brushWidth, setBrushWidth] = useState(5);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [selectedObject, setSelectedObject] = useState<any>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    
    const renderLoopRef = useRef<number | null>(null);
    const isRenderLoopRunning = useRef<boolean>(false);

    // --- State Saving Logic ---
    const saveState = useCallback(() => {
        if (!fabricRef.current || isUnmounting.current) return;
        const canvasState = JSON.stringify(fabricRef.current.toDatalessJSON());
        
        setHistory(prevHistory => {
            const newHistory = prevHistory.slice(0, historyIndex + 1);
            if (newHistory[newHistory.length - 1] === canvasState) {
                return prevHistory;
            }
            newHistory.push(canvasState);
            setHistoryIndex(newHistory.length - 1);
            return newHistory;
        });
    }, [historyIndex]);

    const saveStateRef = useRef(saveState);
    useEffect(() => {
        saveStateRef.current = saveState;
    }, [saveState]);


    // --- Video & Animation Management ---
    const stopAllVideos = useCallback(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        canvas.getObjects().forEach((obj: any) => {
            if (obj.getElement && typeof obj.getElement === 'function' && obj.getElement().tagName === 'VIDEO') {
                obj.getElement().pause();
            }
        });
    }, []);

    const manageRenderLoop = useCallback(() => {
        if (!fabricRef.current || isUnmounting.current) return;
        const canvas = fabricRef.current;
        const videosOnCanvas = canvas.getObjects().filter((obj: any) => 
            obj.getElement && typeof obj.getElement === 'function' && obj.getElement().tagName === 'VIDEO'
        );
        const isAnyVideoPlaying = videosOnCanvas.some((v: any) => !v.getElement().paused);

        if (isAnyVideoPlaying && !isRenderLoopRunning.current) {
            isRenderLoopRunning.current = true;
            const render = () => {
                if (!fabricRef.current || isUnmounting.current) { isRenderLoopRunning.current = false; return; };
                canvas.renderAll();
                renderLoopRef.current = fabric.util.requestAnimFrame(render);
            };
            render();
        } else if (!isAnyVideoPlaying && isRenderLoopRunning.current) {
            if (renderLoopRef.current) {
                fabric.util.cancelAnimFrame(renderLoopRef.current);
                renderLoopRef.current = null;
            }
            isRenderLoopRunning.current = false;
        }
    }, []);


    // --- Imperative Handle for Parent Communication ---
    useImperativeHandle(ref, () => ({
        getCanvasState: () => {
            if (!fabricRef.current) return { json: [], image: '' };
            const canvas = fabricRef.current;
            const simplifiedJson = canvas.getObjects().map((obj: any) => {
                const isVideo = obj.getElement && typeof obj.getElement === 'function' && obj.getElement().tagName === 'VIDEO';
                return { type: isVideo ? 'video' : obj.type, left: obj.left, top: obj.top, width: obj.width * (obj.scaleX || 1), height: obj.height * (obj.scaleY || 1), fill: obj.fill, stroke: obj.stroke, text: obj.text || undefined };
            });
            const image = canvas.toDataURL({ format: 'png' }).split(',')[1];
            return { json: simplifiedJson, image };
        },
        aiAddText: (text: string, options: any) => {
            const canvas = fabricRef.current; if (!canvas) return;
            const newText = new fabric.Textbox(text, { left: options.left || 100, top: options.top || 100, width: canvas.width * 0.7, fill: options.color || color, fontSize: options.fontSize || 20 });
            canvas.add(newText); canvas.renderAll(); saveStateRef.current();
        },
        aiAddShape: (shapeType: string, options: any) => {
            const canvas = fabricRef.current; if (!canvas) return;
            let shape;
            const commonOptions = { left: options.left || 150, top: options.top || 150, fill: options.fill || 'transparent', stroke: options.stroke || color, strokeWidth: options.strokeWidth || brushWidth };
            if (shapeType === 'rect') shape = new fabric.Rect({ ...commonOptions, width: options.width || 100, height: options.height || 100 });
            else if (shapeType === 'circle') shape = new fabric.Circle({ ...commonOptions, radius: options.radius || 50 });
            if (shape) { canvas.add(shape); canvas.renderAll(); saveStateRef.current(); }
        },
        aiAddImage: (imageUrl: string, options: any) => {
            const canvas = fabricRef.current; if (!canvas) return;
            fabric.Image.fromURL(imageUrl, (fabricImage: any) => {
                if (fabricImage) {
                    fabricImage.set({ left: options.left || 100, top: options.top || 100 });
                    fabricImage.scaleToWidth(canvas.width * 0.5);
                    canvas.add(fabricImage);
                    canvas.renderAll();
                    saveStateRef.current();
                } else {
                    console.error("AI failed to load generated image from data URL.");
                }
            });
        },
        aiClearCanvas: () => {
            const canvas = fabricRef.current; if (!canvas) return;
            manageRenderLoop(); canvas.remove(...canvas.getObjects()); canvas.discardActiveObject(); canvas.renderAll(); saveStateRef.current();
        }
    }));


    // --- Object Deletion ---
    const deleteSelectedObject = useCallback(() => {
        const canvas = fabricRef.current; if (!canvas) return;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            const objectsToRemove = activeObject.type === 'activeSelection' ? activeObject.getObjects() : [activeObject];
            objectsToRemove.forEach((obj: any) => {
                 if (obj.getElement && typeof obj.getElement === 'function' && obj.getElement().tagName === 'VIDEO') obj.getElement().pause();
                canvas.remove(obj);
            });
            if (activeObject.type === 'activeSelection') canvas.discardActiveObject();
            canvas.renderAll(); manageRenderLoop(); saveStateRef.current();
        }
    }, [manageRenderLoop]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { if (selectedObject && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); deleteSelectedObject(); } };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedObject, deleteSelectedObject]);
    

    // --- Core Initialization and Cleanup Effect ---
    useEffect(() => {
        let canvasInstance: any = null;
        let parentElement: HTMLElement | null = null;
        let drawingTimeout: number | null = null;
        isUnmounting.current = false;

        const initializeFabric = () => {
            if (!canvasRef.current || fabricRef.current) return;
            if (typeof fabric === 'undefined' || !fabric.Canvas) { setTimeout(initializeFabric, 100); return; }
            
            parentElement = canvasRef.current.parentElement;
            if (!parentElement) return;

            const canvas = new fabric.Canvas(canvasRef.current, { width: parentElement.clientWidth, height: 1000, backgroundColor: '#f9fafb' });
            fabricRef.current = canvas;
            canvasInstance = canvas;

            const initialState = JSON.stringify(canvas.toDatalessJSON());
            setHistory([initialState]);
            setHistoryIndex(0);

            const handleObjectModified = () => saveStateRef.current();
            const handlePathCreated = () => {
                if (drawingTimeout) clearTimeout(drawingTimeout);
                drawingTimeout = window.setTimeout(() => {
                    if (isUnmounting.current) return; // Guard check
                    saveStateRef.current();
                }, 300);
            };
            const handleSelection = (e: any) => setSelectedObject(e.selected ? e.selected[0] : null);

            canvas.on({ 'object:modified': handleObjectModified, 'path:created': handlePathCreated, 'selection:created': handleSelection, 'selection:updated': handleSelection, 'selection:cleared': () => setSelectedObject(null) });

            resizeObserverRef.current = new ResizeObserver(entries => {
                if (!fabricRef.current || isUnmounting.current) return;
                for (let entry of entries) { fabricRef.current.setWidth(entry.contentRect.width); fabricRef.current.renderAll(); }
            });
            resizeObserverRef.current.observe(parentElement);
        };
        
        initializeFabric();

        return () => {
            isUnmounting.current = true;

            // 1. Disconnect the ResizeObserver first to stop layout-related callbacks.
            const observer = resizeObserverRef.current;
            if (observer) {
                observer.disconnect();
                resizeObserverRef.current = null;
            }

            // 2. Clear any pending timers that could interact with the canvas.
            if (drawingTimeout) clearTimeout(drawingTimeout);
            if (renderLoopRef.current) fabric.util.cancelAnimFrame(renderLoopRef.current);

            // 3. Safely clean up the Fabric.js canvas instance using the closure-scoped variable.
            const canvasToDispose = canvasInstance;
            if (canvasToDispose) {
                try {
                    // Stop any playing media elements tied to the canvas.
                    canvasToDispose.getObjects().forEach((obj: any) => {
                        if (obj.getElement && typeof obj.getElement === 'function' && obj.getElement().tagName === 'VIDEO') {
                            const videoEl = obj.getElement();
                            videoEl.pause();
                            videoEl.src = ''; // Release the media resource
                        }
                    });
                    // Unbind all event listeners to prevent memory leaks.
                    canvasToDispose.off();
                    // Dispose of the canvas and all its resources.
                    canvasToDispose.dispose();
                } catch (e) {
                    console.error("Error during robust Fabric.js canvas cleanup:", e);
                }
            }
            
            // 4. Finally, nullify the main ref to signal that the canvas is gone.
            fabricRef.current = null;
        };
    }, []);

    const changeTool = (newTool: string) => {
        setTool(newTool);
        const canvas = fabricRef.current; if (!canvas) return;
        canvas.isDrawingMode = newTool === 'pen' || newTool === 'eraser';
        if (newTool === 'pen') {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.color = color;
            canvas.freeDrawingBrush.width = brushWidth;
        } else if (newTool === 'eraser') {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.color = canvas.backgroundColor;
            canvas.freeDrawingBrush.width = brushWidth;
        }
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newColor = e.target.value; setColor(newColor);
        const canvas = fabricRef.current; if (!canvas) return;
        if (canvas.isDrawingMode && tool === 'pen') canvas.freeDrawingBrush.color = newColor;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
             if (activeObject.type === 'line' || activeObject.type === 'path') activeObject.set('stroke', newColor);
             else if (activeObject.type === 'i-text' || activeObject.type === 'textbox') activeObject.set('fill', newColor);
             else activeObject.set('fill', newColor);
            canvas.renderAll(); saveStateRef.current();
        }
    };
    
    const handleBrushWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = parseInt(e.target.value, 10); setBrushWidth(newWidth);
        const canvas = fabricRef.current; if (!canvas) return;
        if (canvas.isDrawingMode) canvas.freeDrawingBrush.width = newWidth;
        const activeObject = canvas.getActiveObject();
        if (activeObject && (activeObject.type === 'line' || activeObject.type === 'path')) {
            activeObject.set('strokeWidth', newWidth); canvas.renderAll(); saveStateRef.current();
        }
    };

    const addText = () => {
        const canvas = fabricRef.current; if (!canvas) return;
        const text = new fabric.Textbox('Type here...', { left: 100, top: canvas.viewportTransform ? fabric.util.transformPoint({ y: 50, x: 0 }, canvas.viewportTransform).y : 50, fill: color, fontSize: 20, width: canvas.width * 0.7 });
        canvas.add(text); canvas.setActiveObject(text); canvas.renderAll(); changeTool('select'); saveStateRef.current();
    };

    const addShape = (shapeType: 'rect' | 'circle' | 'line') => {
        const canvas = fabricRef.current; if (!canvas) return;
        let shape;
        const commonOptions = { left: 150, top: canvas.viewportTransform ? fabric.util.transformPoint({ y: 50, x: 0 }, canvas.viewportTransform).y : 50, fill: 'transparent', stroke: color, strokeWidth: brushWidth };
        if (shapeType === 'rect') shape = new fabric.Rect({ ...commonOptions, width: 100, height: 100 });
        else if (shapeType === 'circle') shape = new fabric.Circle({ ...commonOptions, radius: 50 });
        else if (shapeType === 'line') shape = new fabric.Line([50, 100, 200, 100], { ...commonOptions });
        if (shape) { canvas.add(shape); canvas.setActiveObject(shape); canvas.renderAll(); changeTool('select'); saveStateRef.current(); }
    };

    const clearCanvas = () => {
        if (window.confirm("Are you sure? This cannot be undone.")) {
            const canvas = fabricRef.current; if (!canvas) return;
            stopAllVideos(); manageRenderLoop(); canvas.remove(...canvas.getObjects()); canvas.discardActiveObject(); canvas.renderAll(); saveStateRef.current();
        }
    };
    
    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1; setHistoryIndex(newIndex);
            const canvas = fabricRef.current; if (!canvas) return;
            stopAllVideos(); manageRenderLoop(); canvas.loadFromJSON(history[newIndex], () => canvas.renderAll());
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1; setHistoryIndex(newIndex);
            const canvas = fabricRef.current; if (!canvas) return;
            stopAllVideos(); manageRenderLoop(); canvas.loadFromJSON(history[newIndex], () => canvas.renderAll());
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video') => {
        const file = e.target.files?.[0]; if (!file) return;
        const canvas = fabricRef.current; if (!canvas) return;
        const onAdd = (obj: any) => { obj.scaleToWidth(canvas.getWidth() * 0.8); canvas.centerObject(obj); canvas.setActiveObject(obj); canvas.renderAll(); saveStateRef.current(); changeTool('select'); };
        
        if (fileType === 'image') {
            const reader = new FileReader();
            reader.onload = (f) => {
                const dataUrl = f.target?.result as string;
                fabric.Image.fromURL(dataUrl, (fabricImage: any) => {
                    if (fabricImage) {
                        onAdd(fabricImage);
                    } else {
                        console.error("Fabric.js failed to create image from data URL.");
                    }
                });
            };
            reader.readAsDataURL(file);
        } else if (fileType === 'video') {
            const url = URL.createObjectURL(file);
            const videoEl = document.createElement('video');
            videoEl.muted = true; videoEl.crossOrigin = 'anonymous'; videoEl.controls = false;
            videoEl.onloadeddata = () => onAdd(new fabric.Image(videoEl, { objectCaching: false }));
            videoEl.src = url;
        }

        if (e.target) e.target.value = '';
    };

    const handleVideoControl = (action: 'play' | 'pause' | 'stop') => {
        if (selectedObject && typeof selectedObject.getElement === 'function' && selectedObject.getElement().tagName === 'VIDEO') {
            const videoEl = selectedObject.getElement();
            if (action === 'play') videoEl.play();
            else if (action === 'pause') videoEl.pause();
            else if (action === 'stop') { videoEl.pause(); videoEl.currentTime = 0; }
            manageRenderLoop();
        }
    }
    
    const toolbarButtons = [
        { name: 'select', icon: <MousePointer2 size={20} />, action: () => changeTool('select')}, { name: 'pen', icon: <Pencil size={20} />, action: () => changeTool('pen')},
        { name: 'eraser', icon: <Eraser size={20} />, action: () => changeTool('eraser')}, { name: 'text', icon: <Type size={20} />, action: addText},
        { name: 'rect', icon: <RectangleHorizontal size={20} />, action: () => addShape('rect')}, { name: 'circle', icon: <Circle size={20} />, action: () => addShape('circle')},
        { name: 'line', icon: <Minus size={20} />, action: () => addShape('line')},
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 h-[524px] flex flex-col">
            <div className="flex-shrink-0 space-y-3">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Shared Smart Whiteboard</h3>
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700">
                    {toolbarButtons.map(btn => ( <button key={btn.name} onClick={btn.action} className={`p-2 rounded-md transition-colors ${tool === btn.name ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title={btn.name}>{btn.icon}</button>))}
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
                    <input type="color" value={color} onChange={handleColorChange} className="w-10 h-10 p-0 border-none rounded-md bg-white dark:bg-gray-700 cursor-pointer" title="Select Color" />
                    <div className="flex items-center space-x-2 bg-white dark:bg-gray-700 px-2 py-1 rounded-md"> <Pencil size={16} /> <input type="range" min="1" max="50" value={brushWidth} onChange={handleBrushWidthChange} className="w-24" title="Brush Size"/> </div>
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
                    <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" title="Undo"><Undo2 size={20} /></button>
                    <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" title="Redo"><Redo2 size={20} /></button>
                    <button onClick={deleteSelectedObject} disabled={!selectedObject} className="p-2 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50" title="Delete Selected"><Trash2 size={20} /></button>
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'image')} style={{ display: 'none' }} accept="image/*" />
                    <input type="file" ref={videoInputRef} onChange={(e) => handleFileChange(e, 'video')} style={{ display: 'none' }} accept="video/*" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600" title="Add Image"><ImagePlus size={20} /></button>
                    <button onClick={() => videoInputRef.current?.click()} className="p-2 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600" title="Add Video"><Video size={20} /></button>
                    <button onClick={clearCanvas} className="p-2 rounded-md bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200" title="Clear Canvas"><Trash2 size={20} /></button>
                </div>
                {selectedObject && typeof selectedObject.getElement === 'function' && selectedObject.getElement().tagName === 'VIDEO' && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700 animate-fade-in">
                        <span className="font-semibold text-sm mr-2">Video Controls:</span>
                        <button onClick={() => handleVideoControl('play')} className="p-2 rounded-md bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-200" title="Play"><Play size={20} /></button>
                        <button onClick={() => handleVideoControl('pause')} className="p-2 rounded-md bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200" title="Pause"><Pause size={20} /></button>
                        <button onClick={() => handleVideoControl('stop')} className="p-2 rounded-md bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200" title="Stop & Rewind"><StopCircle size={20} /></button>
                    </div>
                )}
            </div>
            <div className="flex-grow mt-3 border dark:border-gray-700 rounded-lg overflow-y-auto bg-gray-50 dark:bg-gray-900">
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
});
SmartWhiteboard.displayName = 'SmartWhiteboard';

export default SmartWhiteboard;
