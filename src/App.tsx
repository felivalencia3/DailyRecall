/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useRef, useState, useEffect } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import { ActivityDetector } from "./components/activity-detector/ActivityDetector";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Auth } from "./components/auth/Auth";
import cn from "classnames";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

// Main content component that requires authentication
function MainContent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const { user, signOut } = useAuth();
  
  useEffect(() => {
    setIsCameraActive(videoStream !== null);
  }, [videoStream]);

  return (
    <div className="streaming-console">
      <header className="app-header">
        <div className="header-content">
          <h1>
            <span className="app-logo">
              <span className="material-symbols-outlined">memory</span>
            </span>
            DailyRecall
          </h1>
          <div className="user-info">
            <div className="user-email">
              <span className="material-symbols-outlined">person</span>
              <span>{user?.email}</span>
            </div>
            <button onClick={signOut} className="sign-out-btn">
              <span className="material-symbols-outlined">logout</span>
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="full-width">
        <div className="main-app-area">
          <section className="welcome-section">
            <h2>Welcome to DailyRecall</h2>
            <p>Your AI-powered daily activity assistant for Alzheimer's patients</p>
          </section>
          
          <div className="content-grid">
            <div className="video-container">
              <div className="video-header">
                <h3>Camera Feed</h3>
                <span className={`camera-status-indicator ${isCameraActive ? 'active' : 'inactive'}`}>
                  {isCameraActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="video-content">
                <video
                  className={cn("stream", {
                    hidden: !videoStream,
                    active: videoStream
                  })}
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ display: videoStream ? 'block' : 'none' }}
                />
                {!videoStream && (
                  <div className="camera-placeholder">
                    <span className="material-symbols-outlined">videocam_off</span>
                    <p>Camera is turned off</p>
                    <p className="hint-text">Use the controls below to enable camera</p>
                  </div>
                )}
              </div>
            </div>
            
            <ActivityDetector isCameraActive={isCameraActive} />
          </div>

          <ControlTray
            videoRef={videoRef}
            supportsVideo={true}
            onVideoStreamChange={setVideoStream}
          />
        </div>
      </main>
      <footer className="app-footer">
        <p>&copy; 2024 DailyRecall - Supporting Alzheimer's patients and their caregivers</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <LiveAPIProvider url={uri} apiKey={API_KEY}>
          <AppContent />
        </LiveAPIProvider>
      </AuthProvider>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading DailyRecall...</p>
      </div>
    );
  }
  
  return user ? <MainContent /> : <Auth />;
}

export default App;
