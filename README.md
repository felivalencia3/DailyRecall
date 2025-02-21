# 🧠 MemoryTrack - AI-Powered Activity Logging for Alzheimer's Patients

MemoryTrack is a web-based AI tool designed to assist **Alzheimer's patients** in managing their daily routines using **image and video-based activity logging**. Powered by **Google Gemini 2.0 Multimodal API**, **Supabase**, and a **React + TypeScript** frontend, it automatically tracks tasks like **medication intake, meals, and personal care**, while providing real-time updates to caregivers.  

---

## 🚀 Features

✅ **Image & Video-Based Activity Logging** – AI recognizes actions based on uploaded media.  
✅ **Automated Task Tracking** – Logs routine activities like eating, taking medicine, and self-care.  
✅ **Real-Time Notifications** – Alerts caregivers when a task is completed.  
✅ **User-Friendly Interface** – Simple design optimized for elderly users.  
✅ **Secure Data Storage** – Uses **PostgreSQL (via Supabase)** for cloud storage and authentication.  

---

## 🏗️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (React + TypeScript, TailwindCSS)  
- **Backend**: [Supabase](https://supabase.com/) (PostgreSQL, Authentication, Storage)  
- **AI Integration**: [Google Gemini 2.0 Multimodal API](https://ai.google.dev/gemini-api)  
- **Deployment**: [Vercel](https://vercel.com/) / [Netlify](https://www.netlify.com/)  
- **State Management**: React Context API  

---

## 📂 Project Structure

```plaintext
📦 memorytrack
├── 📂 src
│   ├── 📂 components      # Reusable UI components
│   ├── 📂 pages           # Next.js routing pages
│   ├── 📂 services        # API calls (Gemini, Supabase)
│   ├── 📂 hooks           # Custom React hooks
│   ├── 📂 utils           # Helper functions
├── 📂 public              # Static assets
├── 📂 database            # PostgreSQL schema & migrations
├── .env                   # Environment variables
├── package.json           # Dependencies & scripts
└── README.md              # You’re here!
