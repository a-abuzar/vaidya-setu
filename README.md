<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=238636&fontColor=ffffff&height=250&section=header&text=VaidyaSetu&fontSize=70&fontAlignY=35&desc=AI-Powered%20Patient%20Case-Taking%20Platform&descAlignY=55&descAlign=50" />
</div>

<div align="center">
  <strong>Smart India Hackathon 2024</strong><br>
  <em>Problem Statement ID: 26047 | Ministry of Ayush | All India Institute of Ayurveda</em>
</div>
<br>

<div align="center">
  <img src="https://img.shields.io/badge/Theme-MedTech%20%2F%20HealthTech-2F80ED?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-Under%20Development-F2C94C?style=for-the-badge" />
</div>
<br>

## 📖 About The Project

In India's highly crowded government hospitals, doctors often see 4,000 to 10,000 patients a day in the OPD. This leaves a tiny window of just **2 to 5 minutes per patient**. Within this time, capturing a deeply personalized and comprehensive medical history—especially for traditional **AYUSH (Ayurvedic)** consultations that require assessing *Prakriti* (constitution), *Agni* (digestion), and *Ahara-Vihara* (lifestyle)—is nearly impossible.

**VaidyaSetu** (implementing the *MediKiosk* concept) is a patient-facing, AI-powered software platform that allows patients to independently record their comprehensive medical history and scan their physical medical documents *before* they even step into the doctor's office.

### ✨ The Expected Impact
By automating the history-taking process and digitizing fragmented old records, VaidyaSetu ensures:
- **For Doctors:** A 1-page structured, professional medical summary instantly available on their screen, saving massive amounts of time and reducing diagnostic errors.
- **For Patients:** An accessible, zero-training required interface that communicates in their local language via voice or simple touch icons.

---

## 🚀 Key AI Modules

### A. Conversational History Engine
An intelligent AI interviewer that interacts with the patient in their preferred regional language.
- **Smart Questioning:** Dynamically asks follow-up questions based on patient input (e.g., "When did the chest pain start?").
- **AYUSH Mode:** A specialized track to capture traditional Ayurvedic metrics seamlessly.
- **Emergency Triage (Red Flags):** Instantly detects critical symptoms and alerts hospital staff to skip the queue for urgent treatment.

### B. Medical Document Intelligence
A smart scanning system to handle disorganized, old paper records.
- **Smart OCR:** Extracts critical data from printed and badly handwritten prescriptions.
- **Chronological Timelines:** Automatically organizes old records by date.
- **Abnormality Alerts:** Highlights conflicting medications or dangerous lab results.

### C. Structured Summary Generator
- Merges spoken interview data and scanned documents into a neat, 1-page professional summary (HPI, ROS, etc.).
- Doctors retain full control to edit the summary, while the patient receives audio confirmation in their local language.

### D. Privacy & Consent Layer
- Highly secure architecture integrated with the government's digital health network (**ABDM**).
- Patient verification via **ABHA ID** or Aadhaar.
- Ephemeral sessions: All temporary data is permanently wiped from the kiosk post-consultation.

---

## 🗺️ The Patient Journey

1. **Identify:** Patient logs in, selects a language, and grants voice-explained consent.
2. **Converse:** Natural conversation with the AI regarding health issues and symptoms.
3. **Scan:** Patient feeds old paper prescriptions and lab reports into the system.
4. **Summarize:** AI securely organizes everything into a structured digital file linked to the patient's ABHA ID.
5. **Consult:** The doctor instantly reviews the summarized timeline and focuses entirely on treatment and advice.

---

## 🛠️ Tech Stack (Proposed)
*Add your specific technologies here as you build the project!*
- **Frontend:** React / Next.js / React Native (for kiosk/mobile accessibility)
- **Backend:** Node.js / Python (FastAPI)
- **AI / LLM:** (e.g., OpenAI API, LLaMA, specialized medical NLP models)
- **OCR:** (e.g., Tesseract, Google Cloud Vision, AWS Textract)
- **Database:** PostgreSQL / MongoDB (FHIR compliant structure)

---

## 📚 Glossary of Terms
- **ABDM:** Ayushman Bharat Digital Mission.
- **ABHA ID:** Unique digital health ID for Indian citizens.
- **AYUSH:** Ayurveda, Yoga & Naturopathy, Unani, Siddha, and Homeopathy.
- **Prakriti & Vikriti:** Natural body constitution vs. current disease/imbalance.
- **FHIR:** Fast Healthcare Interoperability Resources (global tech standard for sharing healthcare data).

---
<div align="center">
  <i>Built with ❤️ for Smart India Hackathon</i>
</div>
