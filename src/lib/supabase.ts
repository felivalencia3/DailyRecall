import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our Supabase tables
export type Activity = {
  id?: number;
  created_at?: string;
  user_id?: string;
  activity_type: string;
  notes?: string;
};

// Function to store an activity in Supabase
export async function logActivity(activity: Omit<Activity, 'id' | 'created_at' | 'user_id'>) {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to log activities');
  }
  
  const activityWithUserId = {
    ...activity,
    user_id: user.id
  };
  
  const { data, error } = await supabase
    .from('activities')
    .insert([activityWithUserId])
    .select();
  
  if (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
  
  return data;
}

// Function to fetch activities for the current user
export async function getActivities() {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('You must be logged in to view activities');
  }
  
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching activities:', error);
    throw error;
  }
  
  return data as Activity[];
}
