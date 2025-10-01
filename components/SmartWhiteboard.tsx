// FIX: Removed erroneous file header that was causing a syntax error.
import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { MousePointer2, Pencil, Eraser, Type, Trash2, Undo2, Redo2, ImagePlus, Video, Circle, RectangleHorizontal, Minus, Play, Pause, StopCircle } from 'lucide-react';

declare const fabric: any;

const SmartWhiteboard = forwardRef((props, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<any>(null);
    const [tool, setTool] = useState('select');
    const [color, setColor] = useState('#000000');
    const [brushWidth, setBrushWidth] = useState(5);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [selectedObject, setSelectedObject] = useState<any>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const drawingTimeoutRef = useRef<number | null>(null);
    const videoAnimFrameRef = useRef<number | null>(null);
    const isRenderLoopRunningRef = useRef<boolean>(false);

    const saveState = useCallback(() => {
        if (!fabricRef.current) return;
        const canvasState = JSON.stringify(fabricRef.current.toDatalessJSON());
        
        if (history[historyIndex] === canvasState) return;

        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(canvasState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const saveStateRef = useRef(saveState);
    useEffect(() => {
        saveStateRef.current = saveState;
    }, [saveState]);
    
    useImperativeHandle(ref, () => ({
        getCanvasState: () => {
            if (!fabricRef.current) return { json: [], image: '' };
            const canvas = fabricRef.current;
            const simplifiedJson = canvas.getObjects().map((obj: any) => ({
                type: obj.type,
                left: obj.left,
                top: obj.top,
                width: obj.width * (obj.scaleX || 1),
                height: obj.height * (obj.scaleY || 1),
                fill: obj.fill,
                stroke: obj.stroke,
                text: obj.text || undefined,
            }));
            const image = canvas.toDataURL({ format: 'png' }).split(',')[1];
            return { json: simplifiedJson, image };
        },
        aiAddText: (text: string, options: any) => {
            const canvas = fabricRef.current;
            if (!canvas) return;
            const newText = new fabric.Textbox(text, {
                left: options.left || 100,
                top: options.top || 100,
                width: canvas.width * 0.7, // Ensure text wraps
                fill: options.color || color,
                fontSize: options.fontSize || 20,
            });
            canvas.add(newText);
            canvas.renderAll();
            saveState();
        },
        aiAddShape: (shapeType: string, options: any) => {
            const canvas = fabricRef.current;
            if (!canvas) return;
            let shape;
            const commonOptions = {
                left: options.left || 150,
                top: options.top || 150,
                fill: options.fill || 'transparent',
                stroke: options.stroke || color,
                strokeWidth: options.strokeWidth || brushWidth,
            };
            if (shapeType === 'rect') {
                shape = new fabric.Rect({ ...commonOptions, width: options.width || 100, height: options.height || 100 });
            } else if (shapeType === 'circle') {
                shape = new fabric.Circle({ ...commonOptions, radius: options.radius || 50 });
            }
            if (shape) {
                canvas.add(shape);
                canvas.renderAll();
                saveState();
            }
        },
        aiAddImage: (imageUrl: string, options: any) => {
            const canvas = fabricRef.current;
            if (!canvas) return;
            fabric.Image.fromURL(imageUrl, (img: any) => {
                img.set({
                    left: options.left || 100,
                    top: options.top || 100,
                });
                img.scaleToWidth(canvas.width * 0.5);
                canvas.add(img);
                canvas.renderAll();
                saveState();
            }, { crossOrigin: 'anonymous' });
        },
        aiClearCanvas: () => {
            const canvas = fabricRef.current;
            if (!canvas) return;
            stopVideoAndAnimation();
            const objects = canvas.getObjects();
            objects.forEach((obj: any) => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.renderAll();
            saveState();
        }
    }));


    const stopVideoAndAnimation = useCallback(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        if (isRenderLoopRunningRef.current && videoAnimFrameRef.current) {
            fabric.util.cancelAnimFrame(videoAnimFrameRef.current);
            videoAnimFrameRef.current = null;
            isRenderLoopRunningRef.current = false;
        }
         canvas.getObjects().forEach((obj: any) => {
            if (obj.getElement && typeof obj.getElement === 'function') {
                const el = obj.getElement();
                if (el && el.tagName === 'VIDEO') {
                    el.pause();
                }
            }
        });
    }, []);

    const deleteSelectedObject = useCallback(() => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            if (activeObject.type === 'activeSelection') {
                activeObject.getObjects().forEach((obj: any) => canvas.remove(obj));
                canvas.discardActiveObject();
            } else {
                canvas.remove(activeObject);
            }
            canvas.renderAll();
            saveState();
        }
    }, [saveState]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedObject && (e.key === 'Delete' || e.key === 'Backspace')) {
                e.preventDefault();
                deleteSelectedObject();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedObject, deleteSelectedObject]);

    useEffect(() => {
        let canvasInstance: any = null;
        let resizeObserver: ResizeObserver | null = null;
        let parentElement: HTMLElement | null = null;

        const initializeFabric = () => {
            if (!canvasRef.current || fabricRef.current) return;
            if (typeof fabric === 'undefined' || !fabric.Canvas) {
                setTimeout(initializeFabric, 100);
                return;
            }
            
            parentElement = canvasRef.current.parentElement;
            if (!parentElement) return;

            const canvas = new fabric.Canvas(canvasRef.current, {
                width: parentElement.clientWidth,
                height: 1000,
                backgroundColor: '#f9fafb',
            });
            fabricRef.current = canvas;
            canvasInstance = canvas;

            saveStateRef.current();

            const handleObjectModified = () => saveStateRef.current();
            const handlePathCreated = () => {
                if (drawingTimeoutRef.current) clearTimeout(drawingTimeoutRef.current);
                drawingTimeoutRef.current = window.setTimeout(() => {
                    saveStateRef.current();
                }, 300);
            };
            const handleSelection = (e: any) => setSelectedObject(e.selected ? e.selected[0] : null);

            canvas.on('object:modified', handleObjectModified);
            canvas.on('path:created', handlePathCreated);
            canvas.on('selection:created', handleSelection);
            canvas.on('selection:updated', handleSelection);
            canvas.on('selection:cleared', () => setSelectedObject(null));

            resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    const { width } = entry.contentRect;
                    canvas.setWidth(width);
                    canvas.renderAll();
                }
            });
            if (parentElement) resizeObserver.observe(parentElement);
        };
        
        initializeFabric();

        return () => {
            if (parentElement && resizeObserver) {
                resizeObserver.unobserve(parentElement);
            }
            stopVideoAndAnimation();
            if (canvasInstance) {
                canvasInstance.off();
                canvasInstance.dispose();
            }
            fabricRef.current = null;
        };
    }, [stopVideoAndAnimation]);

    const changeTool = (newTool: string) => {
        setTool(newTool);
        const canvas = fabricRef.current;
        if (!canvas) return;
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
        const newColor = e.target.value;
        setColor(newColor);
        const canvas = fabricRef.current;
        if (!canvas) return;
        
        if (canvas.isDrawingMode && tool === 'pen') {
            canvas.freeDrawingBrush.color = newColor;
        }
        
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
             if (activeObject.type === 'line' || activeObject.type === 'path') {
                activeObject.set('stroke', newColor);
            } else if (activeObject.type === 'i-text' || activeObject.type === 'textbox') {
                 activeObject.set('fill', newColor);
            }
            else {
                activeObject.set('fill', newColor);
            }
            canvas.renderAll();
            saveState();
        }
    };
    
    const handleBrushWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newWidth = parseInt(e.target.value, 10);
        setBrushWidth(newWidth);
        const canvas = fabricRef.current;
        if (!canvas) return;

        if (canvas.isDrawingMode) {
            canvas.freeDrawingBrush.width = newWidth;
        }
        
        const activeObject = canvas.getActiveObject();
        if (activeObject && (activeObject.type === 'line' || activeObject.type === 'path')) {
            activeObject.set('strokeWidth', newWidth);
            canvas.renderAll();
            saveState();
        }
    };

    const addText = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const text = new fabric.Textbox('Type here...', {
            left: 100,
            top: canvas.viewportTransform ? fabric.util.transformPoint({ y: 50, x: 0 }, canvas.viewportTransform).y : 50,
            fill: color,
            fontSize: 20,
            width: canvas.width * 0.7,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
        changeTool('select');
        saveState();
    };

    const addShape = (shapeType: 'rect' | 'circle' | 'line') => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        let shape;
        const commonOptions = { 
            left: 150, 
            top: canvas.viewportTransform ? fabric.util.transformPoint({ y: 50, x: 0 }, canvas.viewportTransform).y : 50,
            fill: 'transparent', 
            stroke: color, 
            strokeWidth: brushWidth 
        };

        if (shapeType === 'rect') {
            shape = new fabric.Rect({ ...commonOptions, width: 100, height: 100 });
        } else if (shapeType === 'circle') {
            shape = new fabric.Circle({ ...commonOptions, radius: 50 });
        } else if (shapeType === 'line') {
            shape = new fabric.Line([50, 100, 200, 100], { ...commonOptions });
        }
        
        if (shape) {
            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.renderAll();
            changeTool('select');
            saveState();
        }
    };

    const clearCanvas = () => {
        if (window.confirm("Are you sure you want to clear the whiteboard? This action cannot be undone.")) {
            const canvas = fabricRef.current;
            if (!canvas) return;
            
            stopVideoAndAnimation();
            
            const objects = canvas.getObjects();
            objects.forEach((obj: any) => canvas.remove(obj));
            
            canvas.discardActiveObject();
            canvas.renderAll();
            saveState();
        }
    };
    
    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const canvas = fabricRef.current;
            if (!canvas) return;
            stopVideoAndAnimation();
            canvas.loadFromJSON(history[newIndex], () => {
                canvas.renderAll();
            });
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const canvas = fabricRef.current;
            if (!canvas) return;
            stopVideoAndAnimation();
            canvas.loadFromJSON(history[newIndex], () => {
                canvas.renderAll();
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video') => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (f) => {
            const data = f.target?.result as string;
            const canvas = fabricRef.current;
            if (!canvas) return;

            const onAdd = (obj: any) => {
                canvas.centerObject(obj);
                canvas.setActiveObject(obj);
                canvas.renderAll();
                saveState();
                changeTool('select');
            };

            if (fileType === 'image') {
                fabric.Image.fromURL(data, (img: any) => {
                    img.scaleToWidth(200);
                    canvas.add(img);
                    onAdd(img);
                });
            } else if (fileType === 'video') {
                const videoEl = document.createElement('video');
                videoEl.muted = true;
                videoEl.src = data;
                
                videoEl.onloadeddata = () => {
                    const video = new fabric.Image(videoEl, {
                        left: 200, top: 200,
                        width: videoEl.videoWidth,
                        height: videoEl.videoHeight,
                        objectCaching: false,
                    });
                    canvas.add(video);
                    video.getElement().play();
                    
                    if (!isRenderLoopRunningRef.current) {
                        isRenderLoopRunningRef.current = true;
                        const render = () => {
                            if(fabricRef.current) fabricRef.current.renderAll();
                            videoAnimFrameRef.current = fabric.util.requestAnimFrame(render);
                        };
                        render();
                    }

                    onAdd(video);
                };
            }
        };
        reader.readAsDataURL(file);
        if (e.target) {
          e.target.value = '';
        }
    };

    const handleVideoControl = (action: 'play' | 'pause' | 'stop') => {
        if (selectedObject && typeof selectedObject.getElement === 'function' && selectedObject.getElement().tagName === 'VIDEO') {
            const videoEl = selectedObject.getElement();
            if (action === 'play') videoEl.play();
            else if (action === 'pause') videoEl.pause();
            else if (action === 'stop') {
                videoEl.pause();
                videoEl.currentTime = 0;
            }
        }
    }
    
    const toolbarButtons = [
        { name: 'select', icon: <MousePointer2 size={20} />, action: () => changeTool('select')},
        { name: 'pen', icon: <Pencil size={20} />, action: () => changeTool('pen')},
        { name: 'eraser', icon: <Eraser size={20} />, action: () => changeTool('eraser')},
        { name: 'text', icon: <Type size={20} />, action: addText},
        { name: 'rect', icon: <RectangleHorizontal size={20} />, action: () => addShape('rect')},
        { name: 'circle', icon: <Circle size={20} />, action: () => addShape('circle')},
        { name: 'line', icon: <Minus size={20} />, action: () => addShape('line')},
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 h-[450px] flex flex-col">
            <div className="flex-shrink-0 space-y-3">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Shared Smart Whiteboard</h3>
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-900 border dark:border-gray-700">
                    {toolbarButtons.map(btn => (
                        <button key={btn.name} onClick={btn.action} className={`p-2 rounded-md transition-colors ${tool === btn.name ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title={btn.name}>
                            {btn.icon}
                        </button>
                    ))}
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
                    <input type="color" value={color} onChange={handleColorChange} className="w-10 h-10 p-0 border-none rounded-md bg-white dark:bg-gray-700 cursor-pointer" title="Select Color" />
                    <div className="flex items-center space-x-2 bg-white dark:bg-gray-700 px-2 py-1 rounded-md">
                        <Pencil size={16} />
                        <input type="range" min="1" max="50" value={brushWidth} onChange={handleBrushWidthChange} className="w-24" title="Brush Size"/>
                    </div>
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

export default SmartWhiteboard;
