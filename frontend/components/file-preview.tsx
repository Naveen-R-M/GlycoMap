'use client'

import React, { useState, useEffect } from 'react';
import ProteinViewer from './protein-viewer';
import ErrorBoundary from './error-boundary';

const FilePreview = ({ file, index, totalFiles }) => {
  const [fileContent, setFileContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileType, setFileType] = useState('unknown');
  const [isPdb, setIsPdb] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [visualizationStyle, setVisualizationStyle] = useState('cartoon');

  // Visualization style options
  const visualizationOptions = [
    { value: 'cartoon', label: 'Cartoon' },
    { value: 'backbone', label: 'Backbone' },
    { value: 'ballAndStick', label: 'Ball & Stick' },
    { value: 'spacefill', label: 'Space Filling' }
  ];

  // Set height based on total files and whether this one is expanded
  const getPreviewHeight = () => {
    if (expanded) return '400px';
    
    // Determine the height based on how many PDB files we have
    const pdbCount = Math.min(totalFiles, 4); // Cap at 4 for layout purposes
    
    if (pdbCount <= 1) return '300px';
    if (pdbCount === 2) return '250px';
    if (pdbCount === 3) return '200px';
    return '180px'; // 4 or more
  };

  useEffect(() => {
    if (!file) {
      setIsLoading(false);
      return;
    }

    // Reset state for new file
    setIsLoading(true);
    setError(null);
    setFileContent(null);
    
    // Determine file type based on extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    setFileType(extension || 'unknown');
    setIsPdb(extension === 'pdb');

    // Only try to read PDB files for visualization
    if (extension === 'pdb') {
      try {
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const content = event.target.result;
            if (typeof content === 'string' && content.length > 0) {
              setFileContent(content);
              setIsLoading(false);
            } else {
              setError('File appears to be empty');
              setIsLoading(false);
            }
          } catch (err) {
            console.error('Error processing file content:', err);
            setError('Error processing file content');
            setIsLoading(false);
          }
        };
        
        reader.onerror = (err) => {
          console.error('FileReader error:', err);
          setError('Error reading file');
          setIsLoading(false);
        };
        
        reader.readAsText(file);
      } catch (err) {
        console.error('Error setting up FileReader:', err);
        setError('Error setting up file reader');
        setIsLoading(false);
      }
    } else {
      // For non-PDB files, just show file info
      setIsLoading(false);
    }
  }, [file]);

  // Skip non-PDB files entirely
  if (!file || !file.name.toLowerCase().endsWith('.pdb')) {
    return null;
  }

  // Get file size in appropriate units
  const getFormattedSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Toggle expanded state
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Handle style change
  const handleStyleChange = (e) => {
    setVisualizationStyle(e.target.value);
  };

  return (
    <div className="mt-4 border border-white/20 rounded-lg overflow-hidden">
      <div className="bg-white/10 px-4 py-3 border-b border-white/20 flex items-center justify-between">
        <h3 className="font-medium text-white">{file.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full text-white/80">
            {getFormattedSize(file.size)}
          </span>
          {isPdb && (
            <button 
              onClick={toggleExpanded} 
              className="text-xs bg-blue-600/50 hover:bg-blue-600 px-2 py-1 rounded-full text-white/90 transition-colors"
            >
              {expanded ? 'Minimize' : 'Expand'}
            </button>
          )}
        </div>
      </div>
      
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center h-[200px] bg-black/30">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto mb-3"></div>
              <p className="text-white/70 text-sm">Loading preview...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[200px] bg-black/30">
            <div className="text-center text-white/70">
              <p className="text-red-400">Error loading preview:</p>
              <p className="mt-2">{error}</p>
            </div>
          </div>
        ) : isPdb && fileContent ? (
          <div className="relative">
            <div style={{ height: getPreviewHeight() }}>
              <ErrorBoundary fallback={
                <div className="flex items-center justify-center h-full bg-black/30">
                  <div className="text-center text-white/70">
                    <p>Error visualizing PDB structure</p>
                    <p className="mt-2 text-sm text-white/50">
                      The file format may not be compatible with the 3D viewer
                    </p>
                  </div>
                </div>
              }>
                <ProteinViewer 
                  pdbData={fileContent} 
                  width="100%" 
                  height="100%"
                  backgroundColor="#111"
                  showControls={false} // We'll use our own controls
                  autoRotate={true}
                  initialStyle={visualizationStyle}
                  key={`protein-${index}-${visualizationStyle}`} // Force re-render on style change
                />
              </ErrorBoundary>
            </div>
            
            {/* Visualization style controls */}
            <div className="absolute top-3 right-3 z-10">
              <select
                value={visualizationStyle}
                onChange={handleStyleChange}
                className="bg-black/70 text-white text-xs border border-white/30 rounded px-2 py-1"
              >
                {visualizationOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[150px] bg-black/30">
            <div className="text-center text-white/70">
              {fileType === 'zip' || fileType === 'tar' || fileType === 'gz' || fileType === 'tgz' ? (
                <>
                  <p>Archive file ({fileType.toUpperCase()})</p>
                  <p className="mt-2 text-sm text-white/50">
                    Contents will be processed after submission
                  </p>
                </>
              ) : (
                <>
                  <p>Preview not available for {fileType.toUpperCase()} files</p>
                  <p className="mt-2 text-sm text-white/50">
                    File will be processed after submission
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
