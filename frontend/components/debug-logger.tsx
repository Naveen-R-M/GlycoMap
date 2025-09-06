'use client'

import { useEffect } from 'react';

export default function DebugLogger() {
  useEffect(() => {
    // Save original console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    // Create an element to show errors on the page
    const debugContainer = document.createElement('div');
    debugContainer.style.position = 'fixed';
    debugContainer.style.bottom = '0';
    debugContainer.style.right = '0';
    debugContainer.style.width = '400px';
    debugContainer.style.maxHeight = '300px';
    debugContainer.style.overflowY = 'auto';
    debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    debugContainer.style.color = 'white';
    debugContainer.style.padding = '10px';
    debugContainer.style.zIndex = '9999';
    debugContainer.style.fontSize = '12px';
    debugContainer.style.fontFamily = 'monospace';
    document.body.appendChild(debugContainer);

    // Add a clear button
    const clearButton = document.createElement('button');
    clearButton.innerText = 'Clear Log';
    clearButton.style.padding = '4px 8px';
    clearButton.style.marginBottom = '8px';
    clearButton.style.backgroundColor = '#444';
    clearButton.style.border = 'none';
    clearButton.style.color = 'white';
    clearButton.style.borderRadius = '4px';
    clearButton.style.cursor = 'pointer';
    clearButton.onclick = () => {
      while (debugContainer.firstChild) {
        debugContainer.removeChild(debugContainer.firstChild);
      }
      debugContainer.appendChild(clearButton);
    };
    debugContainer.appendChild(clearButton);

    // Helper to add messages to the debug container
    const addMessage = (level, args) => {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const messageEl = document.createElement('div');
      messageEl.style.marginBottom = '4px';
      messageEl.style.borderLeft = level === 'error' 
        ? '3px solid #f44336' 
        : level === 'warn' 
          ? '3px solid #ff9800' 
          : '3px solid #2196f3';
      messageEl.style.paddingLeft = '8px';
      
      const prefix = document.createElement('span');
      prefix.innerText = `[${timestamp}] [${level.toUpperCase()}] `;
      prefix.style.color = level === 'error' 
        ? '#f44336' 
        : level === 'warn' 
          ? '#ff9800' 
          : '#2196f3';
      messageEl.appendChild(prefix);
      
      const content = document.createElement('span');
      content.innerText = Array.from(args)
        .map(arg => {
          if (arg instanceof Error) {
            return arg.stack || arg.toString();
          } else if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch (e) {
              return arg.toString();
            }
          }
          return String(arg);
        })
        .join(' ');
      messageEl.appendChild(content);
      
      debugContainer.appendChild(messageEl);
      // Auto-scroll to bottom
      debugContainer.scrollTop = debugContainer.scrollHeight;
    };

    // Override console methods to also show in our debug container
    console.error = function() {
      addMessage('error', arguments);
      originalConsoleError.apply(console, arguments);
    };

    console.warn = function() {
      addMessage('warn', arguments);
      originalConsoleWarn.apply(console, arguments);
    };

    console.log = function() {
      addMessage('log', arguments);
      originalConsoleLog.apply(console, arguments);
    };

    // Catch unhandled errors
    const errorHandler = (event) => {
      const { message, filename, lineno, colno, error } = event;
      console.error(
        `Unhandled error at ${filename}:${lineno}:${colno}`,
        message,
        error
      );
      // Prevent default to see our custom UI
      event.preventDefault();
    };

    // Catch unhandled promise rejections
    const rejectionHandler = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Prevent default to see our custom UI
      event.preventDefault();
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      // Clean up
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      if (document.body.contains(debugContainer)) {
        document.body.removeChild(debugContainer);
      }
    };
  }, []);

  return null;
}
