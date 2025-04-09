/**
 * ActivityDetector component for DailyRecall
 * Detects activities using Gemini 2.0 Flash and maintains a log of detected activities
 */
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useState, memo, FormEvent } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";
import { supabase, logActivity, getActivities, Activity as SupabaseActivity } from "../../lib/supabase";
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
  
  // Load saved activities from Supabase on initial render
  const [activities, setActivities] = useState<LoggedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { client, setConfig } = useLiveAPIContext();

  // Load activities from Supabase when component mounts
  useEffect(() => {
    async function loadActivities() {
      try {
        setIsLoading(true);
        const supabaseActivities = await getActivities();
        
        // Convert Supabase activities to our LoggedActivity format
        const formattedActivities = supabaseActivities.map(activity => ({
          id: activity.id?.toString() || Date.now().toString(),
          activity: activity.activity_type,
          timestamp: new Date(activity.created_at || Date.now()),
          confidence: 0.95, // Default confidence since we don't store it in Supabase
          notes: activity.notes || undefined
        }));
        
        setActivities(formattedActivities);
      } catch (error) {
        console.error('Error loading activities from Supabase:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadActivities();
  }, []);

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
          
          // Store activity in Supabase
          logActivity({
            activity_type: args.activity,
            notes: args.notes
          }).then(data => {
            console.log('Activity logged to Supabase:', data);
          }).catch(error => {
            console.error('Error logging activity to Supabase:', error);
          });
          
          setActivities(prev => [newActivity, ...prev]);
        } else {
          console.log(`Ignored low-confidence activity detection: ${args.activity} (${confidence})`);
        }
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

  // State for manual activity logging form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualActivity, setManualActivity] = useState<string>(ACTIVITIES[0]);
  const [manualNotes, setManualNotes] = useState('');
  
  // Function to clear all activities
  const clearActivities = async () => {
    if (window.confirm('Are you sure you want to clear all activity logs?')) {
      try {
        // Delete all user's activities from Supabase
        const { error } = await supabase
          .from('activities')
          .delete()
          .neq('id', 0); // This will delete all records

        if (error) throw error;
        
        // Clear the local state
        setActivities([]);
      } catch (error) {
        console.error('Error clearing activities:', error);
        alert('Failed to clear activities. Please try again.');
      }
    }
  };

  // Function to manually log an activity
  const handleManualActivitySubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      // Log to Supabase
      await logActivity({
        activity_type: manualActivity,
        notes: manualNotes.trim() || undefined
      });
      
      // Add to local state
      const newActivity: LoggedActivity = {
        id: Date.now().toString(),
        activity: manualActivity,
        timestamp: new Date(),
        confidence: 1.0, // Manual entries are 100% confidence
        notes: manualNotes.trim() || undefined,
      };
      
      setActivities(prev => [newActivity, ...prev]);
      
      // Reset form
      setManualNotes('');
      setShowManualForm(false);
    } catch (error) {
      console.error('Error manually logging activity:', error);
      alert('Failed to log activity. Please try again.');
    }
  };

  return (
    <div className="activity-detector">
      <div className="activity-header">
        <h2>Activity Log</h2>
        <div className="header-controls">
          <div className={`camera-status ${isCameraActive ? 'active' : 'inactive'}`}>
            Camera: {isCameraActive ? 'Active' : 'Inactive'}
          </div>
          <div className="header-buttons">
            <button 
              className="add-button" 
              onClick={() => setShowManualForm(!showManualForm)}
              aria-label="Manually log activity"
            >
              {showManualForm ? 'Cancel' : 'Log Activity'}
            </button>
            {activities.length > 0 && (
              <button 
                className="clear-button" 
                onClick={clearActivities}
              >
                Clear Log
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Manual activity logging form */}
      {showManualForm && (
        <div className="manual-activity-form">
          <form onSubmit={handleManualActivitySubmit}>
            <div className="form-row">
              <label htmlFor="activity-select">Activity:</label>
              <select 
                id="activity-select"
                value={manualActivity}
                onChange={(e) => setManualActivity(e.target.value)}
                required
              >
                {ACTIVITIES.map(activity => (
                  <option key={activity} value={activity}>
                    {activity.charAt(0).toUpperCase() + activity.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-row">
              <label htmlFor="activity-notes">Notes (optional):</label>
              <input
                id="activity-notes"
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Add details about the activity"
              />
            </div>
            
            <div className="form-row form-buttons">
              <button type="submit" className="submit-button">
                Add to Log
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="activity-list">
        {isLoading ? (
          <div className="loading-indicator">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="no-activities">
            <p>No activities detected yet.</p>
            <p>Turn on the camera and perform an activity.</p>
            <p>Or use the "Log Activity" button to add manually.</p>
          </div>
        ) : (
          <ul>
            {activities.map((activity) => (
              <li key={activity.id} className={`activity-item ${activity.activity}`}>
                <div className="activity-icon">
                  {activity.activity === "eating" && <span className="material-symbols-outlined">restaurant</span>}
                  {activity.activity === "drinking" && <span className="material-symbols-outlined">local_drink</span>}
                  {activity.activity === "taking medication" && <span className="material-symbols-outlined">medication</span>}
                </div>
                <div className="activity-details">
                  <h3 className="activity-name">
                    {activity.activity.charAt(0).toUpperCase() + activity.activity.slice(1)}
                    {activity.confidence === 1.0 && <span className="manual-tag">(Manual)</span>}
                  </h3>
                  <p className="activity-time">{formatTimestamp(activity.timestamp)}</p>
                  {activity.notes && <p className="activity-notes">{activity.notes}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export const ActivityDetector = memo(ActivityDetectorComponent);
