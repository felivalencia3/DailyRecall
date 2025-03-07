/**
 * ActivityDetector component for DailyRecall
 * Detects activities using Gemini 2.0 Flash and maintains a log of detected activities
 */
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useState, memo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";
import "./activity-detector.scss";

// Define the activities we want to detect
const ACTIVITIES = ["eating", "drinking", "taking medication"];

// Function declaration for the activity detection tool
const activityDetectionTool: FunctionDeclaration = {
  name: "log_detected_activity",
  description: "Logs a detected activity when the user performs one of the monitored activities.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      activity: {
        type: SchemaType.STRING,
        description: `The detected activity. Must be one of: ${ACTIVITIES.join(", ")}`,
        enum: ACTIVITIES,
      },
      confidence: {
        type: SchemaType.NUMBER,
        description: "Confidence level of the detection (0-1)",
      },
      notes: {
        type: SchemaType.STRING,
        description: "Any additional notes or observations about the activity",
      }
    },
    required: ["activity"],
  },
};

// Type for logged activities
interface LoggedActivity {
  id: string;
  activity: string;
  timestamp: Date;
  confidence: number;
  notes?: string;
}

interface ActivityDetectorProps {
  isCameraActive?: boolean;
}

function ActivityDetectorComponent({ isCameraActive = false }: ActivityDetectorProps) {
  // Helper function to format timestamps in a friendly, readable way
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if the date is today
    if (date.getDate() === today.getDate() && 
        date.getMonth() === today.getMonth() && 
        date.getFullYear() === today.getFullYear()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Check if the date is yesterday
    if (date.getDate() === yesterday.getDate() && 
        date.getMonth() === yesterday.getMonth() && 
        date.getFullYear() === yesterday.getFullYear()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // For other dates
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  // Load saved activities from localStorage on initial render
  const [activities, setActivities] = useState<LoggedActivity[]>(() => {
    const savedActivities = localStorage.getItem('dailyRecall_activities');
    if (savedActivities) {
      try {
        // Parse the saved activities and convert string timestamps back to Date objects
        const parsed = JSON.parse(savedActivities);
        return parsed.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp)
        }));
      } catch (error) {
        console.error('Error loading saved activities:', error);
        return [];
      }
    }
    return [];
  });
  const { client, setConfig } = useLiveAPIContext();

  useEffect(() => {
    // Configure the Gemini model with our custom system instructions
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: `You are DailyRecall, an assistant for Alzheimer's patients. You have two main functions:

1. Act as a helpful conversational assistant who can answer questions and engage in normal conversation
2. Monitor the camera feed to detect specific activities ONLY when you are 100% certain

The activities you should detect are: ${ACTIVITIES.join(", ")}.

IMPORTANT GUIDELINES:
- ONLY detect an activity if you are 100% certain it is occurring
- It is perfectly fine if no activity is detected - do not try to detect activities that aren't clearly happening
- Be comfortable with no action - the user may just be sitting there talking to you
- When you do detect an activity with 100% certainty:
  1. Call the log_detected_activity function
  2. Speak to the user in a clear, friendly voice to acknowledge what they're doing
  3. Be encouraging and supportive

Keep your responses brief and clear. Speak in short sentences that are easy to understand.
Do not detect the same activity multiple times in a short period.

Remember that your conversational abilities are just as important as activity detection. Respond helpfully to all user questions and engage in normal conversation.`,
          },
        ],
      },
      tools: [
        { functionDeclarations: [activityDetectionTool] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`Got tool call`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === activityDetectionTool.name,
      );
      
      if (fc) {
        const args = fc.args as any;
        // Only log activities with high confidence (0.9 or higher)
        const confidence = args.confidence || 0.95;
        if (confidence >= 0.9) {
          const newActivity: LoggedActivity = {
            id: Date.now().toString(),
            activity: args.activity,
            timestamp: new Date(),
            confidence: confidence,
            notes: args.notes,
          };
          
          setActivities(prev => {
            const updatedActivities = [newActivity, ...prev];
            // Save to localStorage whenever activities change
            try {
              localStorage.setItem('dailyRecall_activities', JSON.stringify(updatedActivities));
            } catch (error) {
              console.error('Error saving activities to localStorage:', error);
            }
            return updatedActivities;
          });
        } else {
          console.log(`Ignored low-confidence activity detection: ${args.activity} (${confidence})`);
        }
        // Activity is now logged in the conditional block above
      }
      
      // Send response for the tool call
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
              })),
            }),
          200,
        );
      }
    };
    
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  return (
    <div className="activity-detector">
      <div className="activity-header">
        <h2>Activity Log</h2>
        <div className="header-controls">
          <div className={`camera-status ${isCameraActive ? 'active' : 'inactive'}`}>
            Camera: {isCameraActive ? 'Active' : 'Inactive'}
          </div>
          {activities.length > 0 && (
            <button 
              className="clear-button" 
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all activity logs?')) {
                  setActivities([]);
                  localStorage.removeItem('dailyRecall_activities');
                }
              }}
            >
              Clear Log
            </button>
          )}
        </div>
      </div>
      
      <div className="activity-list">
        {activities.length === 0 ? (
          <div className="no-activities">
            <p>No activities detected yet.</p>
            <p>Turn on the camera and perform an activity.</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="activity-item">
              <div className="activity-name">
                <span className="activity-icon">✓</span>
                {activity.activity.charAt(0).toUpperCase() + activity.activity.slice(1)}
              </div>
              <div className="activity-time">
                {formatTimestamp(activity.timestamp)}
              </div>
              {activity.notes && <div className="activity-notes">{activity.notes}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const ActivityDetector = memo(ActivityDetectorComponent);
