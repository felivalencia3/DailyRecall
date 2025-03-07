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

import cn from "classnames";

import { memo, ReactNode, RefObject, useEffect, useRef, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { UseMediaStreamResult } from "../../hooks/use-media-stream-mux";
import { useScreenCapture } from "../../hooks/use-screen-capture";
import { useWebcam } from "../../hooks/use-webcam";
import { AudioRecorder } from "../../lib/audio-recorder";
import AudioPulse from "../audio-pulse/AudioPulse";
import "./control-tray.scss";

export type ControlTrayProps = {
  videoRef: RefObject<HTMLVideoElement>;
  children?: ReactNode;
  supportsVideo: boolean;
  onVideoStreamChange?: (stream: MediaStream | null) => void;
};

type MediaStreamButtonProps = {
  isStreaming: boolean;
  onIcon: string;
  offIcon: string;
  start: () => Promise<any>;
  stop: () => any;
};

/**
 * button used for triggering webcam or screen-capture
 */
const MediaStreamButton = memo(
  ({ isStreaming, onIcon, offIcon, start, stop }: MediaStreamButtonProps) =>
    isStreaming ? (
      <button className="action-button" onClick={stop}>
        <span className="material-symbols-outlined">{onIcon}</span>
      </button>
    ) : (
      <button className="action-button" onClick={start}>
        <span className="material-symbols-outlined">{offIcon}</span>
      </button>
    ),
);

function ControlTray({
  videoRef,
  children,
  onVideoStreamChange = () => {},
  supportsVideo,
}: ControlTrayProps) {
  const videoStreams = [useWebcam(), useScreenCapture()];
  const [activeVideoStream, setActiveVideoStream] =
    useState<MediaStream | null>(null);
  const [webcam, screenCapture] = videoStreams;
  const [inVolume, setInVolume] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [muted, setMuted] = useState(false);
  const renderCanvasRef = useRef<HTMLCanvasElement>(null);
  const connectButtonRef = useRef<HTMLButtonElement>(null);

  const { client, connected, connect, disconnect, volume } =
    useLiveAPIContext();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--volume",
      `${Math.max(5, Math.min(inVolume * 200, 8))}px`,
    );
  }, [inVolume]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: "audio/pcm;rate=16000",
          data: base64,
        },
      ]);
    };
    if (connected && !muted && audioRecorder) {
      audioRecorder.on("data", onData).on("volume", setInVolume).start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off("data", onData).off("volume", setInVolume);
    };
  }, [connected, client, muted, audioRecorder]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = activeVideoStream;
      console.log("Set video srcObject:", activeVideoStream ? "active stream" : "null");
    }

    let timeoutId = -1;

    function sendVideoFrame() {
      const video = videoRef.current;
      const canvas = renderCanvasRef.current;

      if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
        console.log("Cannot send video frame - missing video element or dimensions");
        if (connected && activeVideoStream) {
          // Try again in a moment if we're connected but can't get the frame yet
          timeoutId = window.setTimeout(sendVideoFrame, 500);
        }
        return;
      }

      try {
        // Use a larger size for better visibility
        const ctx = canvas.getContext("2d", { alpha: false })!;
        canvas.width = video.videoWidth * 0.5;
        canvas.height = video.videoHeight * 0.5;
        
        if (canvas.width > 0 && canvas.height > 0) {
          // Clear the canvas first
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to JPEG with high quality
          const base64 = canvas.toDataURL("image/jpeg", 0.9);
          const data = base64.slice(base64.indexOf(",") + 1, Infinity);
          
          console.log(`Sending video frame: ${canvas.width}x${canvas.height}`);
          client.sendRealtimeInput([{ mimeType: "image/jpeg", data }]);
        } else {
          console.warn("Canvas has invalid dimensions", { width: canvas.width, height: canvas.height });
        }
      } catch (error) {
        console.error("Error sending video frame:", error);
      }
      
      if (connected && activeVideoStream) {
        // Send frames at 2 frames per second
        timeoutId = window.setTimeout(sendVideoFrame, 500);
      }
    }
    
    if (connected && activeVideoStream !== null) {
      console.log("Starting to send video frames to API");
      // Wait a short moment to ensure video is properly initialized
      setTimeout(sendVideoFrame, 1000);
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [connected, activeVideoStream, client, videoRef]);

  //handler for swapping from one video-stream to the next
  const changeStreams = (next?: UseMediaStreamResult) => async () => {
    try {
      // Stop all current streams first
      videoStreams.filter((msr) => msr !== next).forEach((msr) => msr.stop());
      
      if (next) {
        console.log(`Starting ${next.type} stream`);
        const mediaStream = await next.start();
        console.log(`${next.type} stream started successfully`);
        
        // Set the active stream
        setActiveVideoStream(mediaStream);
        onVideoStreamChange(mediaStream);
        
        // Ensure video element gets updated
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          console.log("Video element srcObject set directly");
        }
      } else {
        console.log("Stopping all streams");
        setActiveVideoStream(null);
        onVideoStreamChange(null);
        
        // Clear video element
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    } catch (error) {
      console.error("Error changing streams:", error);
    }
  };

  return (
    <section className="control-tray">
      <canvas style={{ display: "none" }} ref={renderCanvasRef} />
      <nav className={cn("actions-nav", { disabled: !connected })}>
        <button
          className={cn("action-button mic-button")}
          onClick={() => setMuted(!muted)}
        >
          {!muted ? (
            <span className="material-symbols-outlined filled">mic</span>
          ) : (
            <span className="material-symbols-outlined filled">mic_off</span>
          )}
        </button>

        <div className="action-button no-action outlined">
          <AudioPulse volume={volume} active={connected} hover={false} />
        </div>

        {supportsVideo && (
          <>
            <MediaStreamButton
              isStreaming={screenCapture.isStreaming}
              start={changeStreams(screenCapture)}
              stop={changeStreams()}
              onIcon="cancel_presentation"
              offIcon="present_to_all"
            />
            <MediaStreamButton
              isStreaming={webcam.isStreaming}
              start={changeStreams(webcam)}
              stop={changeStreams()}
              onIcon="videocam_off"
              offIcon="videocam"
            />
          </>
        )}
        {children}
      </nav>

      <div className={cn("connection-container", { connected })}>
        <div className="connection-button-container">
          <button
            ref={connectButtonRef}
            className={cn("action-button connect-toggle", { connected })}
            onClick={connected ? disconnect : connect}
          >
            <span className="material-symbols-outlined filled">
              {connected ? "pause" : "play_arrow"}
            </span>
          </button>
        </div>
        <span className="text-indicator">Streaming</span>
      </div>
    </section>
  );
}

export default memo(ControlTray);
