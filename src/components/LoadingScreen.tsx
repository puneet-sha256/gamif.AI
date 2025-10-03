import React from 'react';
import './LoadingScreen.css';

const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="loading-background" />
      <div className="shadows" />
      
      <div className="loading-content">
        <div className="loading-logo">
          <h1>SOLO LEVELING</h1>
          <div className="subtitle">Player System</div>
        </div>
        
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Initializing System...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
