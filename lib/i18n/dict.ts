/**
 * Lightweight in-process i18n dictionary for the patient-facing kiosk.
 *
 * No external dependency on next-intl or react-i18next — the kiosk only
 * has three languages and a bounded, hand-curated copy surface. Each
 * key is intentionally short so screens remain readable.
 *
 * Pattern: `t(lang, "key.path")` returns the localized string, falling
 * back to English if a translation is missing in the chosen language.
 */
import type { SupportedLanguage } from "@/lib/types";

type Dict = Record<string, string>;

const en: Dict = {
  "app.title": "VaidyaSetu",
  "app.subtitle": "AYUSH OPD Kiosk",
  "app.ministry": "Ministry of AYUSH, Government of India",

  "a11y.textSize": "Text size",
  "a11y.textSize.comfortable": "Comfortable",
  "a11y.textSize.large": "Large",
  "a11y.textSize.xlarge": "Extra Large",
  "a11y.highContrast": "High contrast",
  "a11y.audio": "Voice narration",
  "a11y.audio.on": "Audio on",
  "a11y.audio.off": "Audio off",

  "nav.back": "Back",
  "nav.home": "Home",
  "nav.help": "Call for help",
  "nav.skip": "Skip",
  "nav.continue": "Continue",
  "nav.cancel": "Cancel",
  "nav.confirm": "Confirm",
  "nav.retry": "Try again",
  "nav.next": "Next",

  "step.welcome": "Welcome",
  "step.consent": "Your privacy",
  "step.identify": "Identify yourself",
  "step.encounter": "Your symptoms",
  "step.documents": "Your documents",
  "step.summary": "Your summary",
  "step.done": "Done",
  "step.of": "Step {current} of {total}",

  "online.online": "Online",
  "online.offline": "Offline — saved locally",

  "welcome.heading": "Welcome to VaidyaSetu",
  "welcome.subheading":
    "An AI-assisted case-taking kiosk for your AYUSH consultation. Please tap a language to begin.",
  "welcome.chooseLanguage": "Choose your language",
  "welcome.greeting.hi": "नमस्ते — Welcome",
  "welcome.greeting.en": "Hello — Welcome",
  "welcome.greeting.ta": "வணக்கம் — Welcome",
  "welcome.compliance.ministry": "Built for the Ministry of AYUSH",
  "welcome.compliance.abdm": "ABDM aligned",
  "welcome.compliance.dpdp": "DPDP Act 2023 compliant",
  "welcome.compliance.iiit": "AIIA-grade design",
  "welcome.start": "Tap to start",
  "welcome.preview.hi": "हिन्दी",
  "welcome.preview.en": "English",
  "welcome.preview.ta": "தமிழ்",
  "welcome.preview.sub.hi": "Hindi / Hinglish",
  "welcome.preview.sub.en": "English",
  "welcome.preview.sub.ta": "Tamil / Tanglish",

  "consent.heading": "Your privacy choices",
  "consent.subheading":
    "Before we ask you any health questions, please review and decide. You can change these at any time during the visit.",
  "consent.toggle": "I agree",
  "consent.required": "Required to continue",
  "consent.purpose.clinical": "Clinical data collection",
  "consent.purpose.clinical.desc":
    "We will record the answers you give about your symptoms and history, so the doctor can read them.",
  "consent.purpose.abdm": "ABDM health record linking",
  "consent.purpose.abdm.desc":
    "If you choose, we can link this visit to your Ayushman Bharat health ID (ABHA) so your old records are available.",
  "consent.purpose.physician": "Share with the consulting doctor",
  "consent.purpose.physician.desc":
    "Your summary will be shown to the doctor you are about to meet so they can help you faster.",
  "consent.purpose.storage": "Store for this visit only",
  "consent.purpose.storage.desc":
    "We will keep your data until the end of this visit, then delete it. We do not store it permanently.",
  "consent.playAudio": "Read this aloud",
  "consent.review": "Review and continue",
  "consent.requiredError":
    "Please accept the required consent (clinical data collection) to continue.",

  "identify.heading": "Identify yourself",
  "identify.subheading":
    "You may continue without an ABHA number. Your visit will still work, and your data will be wiped after the consultation.",
  "identify.linkAbha": "Link my ABHA number",
  "identify.linkAbha.desc":
    "Recommended. Pulls your past records from ABDM and lets the doctor see your history.",
  "identify.continueAnon": "Continue without ABHA",
  "identify.continueAnon.desc":
    "Your visit uses a temporary session token. Nothing is linked to a national ID.",
  "identify.abhaLabel": "ABHA number (14 digits)",
  "identify.abhaPlaceholder": "12-3456-7890-1234",
  "identify.abhaHelp": "You can find this on your ABHA card or the ABHA app.",
  "identify.method": "Verification method",
  "verify.aadhaar_otp": "Aadhaar OTP",
  "verify.mobile_otp": "Mobile OTP",
  "verify.demographics": "Demographics (name, DOB)",
  "identify.submit": "Verify and link",
  "identify.notImplemented":
    "ABHA verification is wired but waiting on the live ABDM gateway. Your visit will continue without linking.",
  "identify.skipSuccess": "Continuing with a temporary session.",

  "encounter.heading": "Tell us how you are feeling",
  "encounter.subheading":
    "Speak or tap. You can change any answer by saying “that's not right”.",
  "encounter.placeholder":
    "Tap and hold the microphone, then describe your symptoms.",
  "encounter.lastHeard": "We heard you say",
  "encounter.wrong": "That's not right, ask again",
  "encounter.next": "Next question",
  "encounter.finish": "Finish interview",
  "encounter.listening": "Listening… release to send",
  "encounter.hold": "Hold to speak",
  "encounter.processing": "Thinking…",
  "encounter.optionsTitle": "Or tap an answer",
  "encounter.correctTitle": "Did we get this right?",
  "encounter.correct.yes": "Yes, continue",
  "encounter.correct.no": "No, try again",
  "encounter.voiceOnly": "Voice only",
  "encounter.touchOnly": "Touch only",
  "encounter.audioFailed":
    "We could not understand the audio. Please try again or tap an answer.",

  "redflag.heading": "Important — please listen",
  "redflag.body":
    "Your answers suggest you need urgent attention. A staff member has been notified and will be with you shortly. Please remain at the kiosk.",
  "redflag.confirm": "I understand — wait for staff",
  "redflag.notify": "Staff notified",
  "redflag.reason": "What we noticed",
  "redflag.continueAnyway":
    "If you are not having this problem, tap to continue.",

  "documents.heading": "Do you have any documents to share?",
  "documents.subheading":
    "Old prescriptions, lab results, or discharge summaries help your doctor help you faster. You can also skip this step.",
  "documents.type.prescription": "Prescription",
  "documents.type.lab_report": "Lab report",
  "documents.type.discharge_summary": "Discharge summary",
  "documents.type.imaging": "Imaging (X-ray, CT, MRI)",
  "documents.capture": "Capture document",
  "documents.retake": "Retake photo",
  "documents.preview": "Looks good",
  "documents.uploaded": "Document added",
  "documents.scanAnother": "Scan another document",
  "documents.skip": "I have no documents",
  "documents.camera.permission":
    "Please allow camera access. If denied, you can continue without documents.",
  "documents.camera.fail":
    "We could not start the camera. You can skip this step and the doctor will still see you.",
  "documents.guide": "Place the document inside the frame",
  "documents.processing": "Reading the document…",

  "summary.heading": "Here is what we recorded",
  "summary.subheading":
    "Please read this in your language. If anything is wrong, tell us so we can fix it.",
  "summary.chiefComplaint": "Main concern",
  "summary.history": "Your answers",
  "summary.documents": "Your documents",
  "summary.redFlag": "Urgent finding",
  "summary.readAloud": "Read aloud",
  "summary.correct": "This is correct",
  "summary.fix": "Something is wrong",
  "summary.print": "Print this summary",
  "summary.qr": "Show on my phone",
  "summary.takenAway": "Take-away code",
  "summary.finalize": "Send to doctor",
  "summary.finalizing": "Sending to doctor…",
  "summary.thanks": "Thank you. Please take your seat; the doctor will see you shortly.",
  "summary.confirmFinalize.heading": "Send this summary to the doctor?",
  "summary.confirmFinalize.body":
    "After this, your visit data will be deleted from the kiosk. You will not be able to change it again here.",
  "summary.confirmFinalize.confirm": "Yes, send to doctor",
  "summary.confirmFinalize.cancel": "Wait, let me check",

  "error.generic": "Something went wrong.",
  "error.network": "We could not reach the network. Your answers are saved.",
  "error.retry": "Please try again.",
  "error.ttsUnavailable":
    "Audio is not available in this browser. The text is still readable.",

  "help.heading": "Need help?",
  "help.body":
    "A staff member has been notified. They will be with you in a moment. Please stay near the kiosk.",
  "help.called": "Help requested",
  "help.cancel": "Cancel help",
};

const hi: Dict = {
  "app.title": "वैद्यसेतु",
  "app.subtitle": "आयुष ओपीडी कियोस्क",
  "app.ministry": "आयुष मंत्रालय, भारत सरकार",

  "a11y.textSize": "अक्षर का आकार",
  "a11y.textSize.comfortable": "सहज",
  "a11y.textSize.large": "बड़ा",
  "a11y.textSize.xlarge": "बहुत बड़ा",
  "a11y.highContrast": "हाई कॉन्ट्रास्ट",
  "a11y.audio": "आवाज़",
  "a11y.audio.on": "आवाज़ चालू",
  "a11y.audio.off": "आवाज़ बंद",

  "nav.back": "वापस",
  "nav.home": "होम",
  "nav.help": "मदद बुलाएँ",
  "nav.skip": "छोड़ें",
  "nav.continue": "जारी रखें",
  "nav.cancel": "रद्द करें",
  "nav.confirm": "पुष्टि करें",
  "nav.retry": "फिर कोशिश करें",
  "nav.next": "आगे",

  "step.welcome": "स्वागत",
  "step.consent": "आपकी निजता",
  "step.identify": "अपना परिचय",
  "step.encounter": "आपके लक्षण",
  "step.documents": "आपके काग़ज़ात",
  "step.summary": "आपका सारांश",
  "step.done": "पूरा हुआ",
  "step.of": "चरण {current} / {total}",

  "online.online": "ऑनलाइन",
  "online.offline": "ऑफ़लाइन — स्थानीय रूप से सहेजा गया",

  "welcome.heading": "वैद्यसेतु में आपका स्वागत है",
  "welcome.subheading":
    "आपके आयुष परामर्श के लिए एक एआई सहायक कियोस्क। शुरू करने के लिए अपनी भाषा चुनें।",
  "welcome.chooseLanguage": "अपनी भाषा चुनें",
  "welcome.greeting.hi": "नमस्ते — स्वागत है",
  "welcome.greeting.en": "Hello — Welcome",
  "welcome.greeting.ta": "வணக்கம் — Welcome",
  "welcome.compliance.ministry": "आयुष मंत्रालय के लिए बनाया गया",
  "welcome.compliance.abdm": "ABDM के अनुरूप",
  "welcome.compliance.dpdp": "DPDP अधिनियम 2023 के अनुरूप",
  "welcome.compliance.iiit": "AIIA-स्तरीय डिज़ाइन",
  "welcome.start": "शुरू करने के लिए टैप करें",
  "welcome.preview.hi": "हिन्दी",
  "welcome.preview.en": "English",
  "welcome.preview.ta": "தமிழ்",
  "welcome.preview.sub.hi": "हिन्दी / हिंग्लिश",
  "welcome.preview.sub.en": "English",
  "welcome.preview.sub.ta": "Tamil / Tanglish",

  "consent.heading": "आपकी निजता के विकल्प",
  "consent.subheading":
    "हम कोई भी स्वास्थ्य प्रश्न पूछने से पहले, कृपया यह देखें और तय करें। इस दौरान आप इन्हें बदल सकते हैं।",
  "consent.toggle": "मैं सहमत हूँ",
  "consent.required": "जारी रखने के लिए आवश्यक",
  "consent.purpose.clinical": "स्वास्थ्य आँकड़े एकत्र करना",
  "consent.purpose.clinical.desc":
    "आपके लक्षणों और इतिहास के उत्तर रिकॉर्ड किए जाएँगे ताकि डॉक्टर उन्हें पढ़ सकें।",
  "consent.purpose.abdm": "ABDM स्वास्थ्य रिकॉर्ड से जोड़ना",
  "consent.purpose.abdm.desc":
    "यदि आप चाहें तो हम इस विज़िट को आपके आयुष्मान भारत स्वास्थ्य आईडी (ABHA) से जोड़ सकते हैं।",
  "consent.purpose.physician": "डॉक्टर के साथ साझा करना",
  "consent.purpose.physician.desc":
    "आपका सारांश उस डॉक्टर को दिखाया जाएगा जिनसे आप मिलने वाले हैं।",
  "consent.purpose.storage": "केवल इस विज़िट के लिए सहेजना",
  "consent.purpose.storage.desc":
    "हम आपका डेटा इस विज़िट तक रखेंगे और फिर हटा देंगे। हम इसे स्थायी रूप से नहीं रखते।",
  "consent.playAudio": "इसे पढ़कर सुनाएँ",
  "consent.review": "देखें और जारी रखें",
  "consent.requiredError":
    "जारी रखने के लिए कृपया आवश्यक सहमति (स्वास्थ्य आँकड़े) दें।",

  "identify.heading": "अपना परिचय दें",
  "identify.subheading":
    "आप ABHA नंबर के बिना भी जारी रख सकते हैं। आपकी विज़िट फिर भी चलेगी, और डेटा परामर्श के बाद हटा दिया जाएगा।",
  "identify.linkAbha": "मेरा ABHA नंबर जोड़ें",
  "identify.linkAbha.desc":
    "सिफ़ारिश की गई। ABDM से आपके पुराने रिकॉर्ड लाकर डॉक्टर को दिखाए जाएँगे।",
  "identify.continueAnon": "ABHA के बिना जारी रखें",
  "identify.continueAnon.desc":
    "आपकी विज़िट अस्थायी सत्र टोकन का उपयोग करती है। किसी राष्ट्रीय आईडी से नहीं जोड़ा जाता।",
  "identify.abhaLabel": "ABHA नंबर (14 अंक)",
  "identify.abhaPlaceholder": "12-3456-7890-1234",
  "identify.abhaHelp": "यह आपके ABHA कार्ड या ABHA ऐप पर मिलेगा।",
  "identify.method": "सत्यापन का तरीका",
  "verify.aadhaar_otp": "आधार OTP",
  "verify.mobile_otp": "मोबाइल OTP",
  "verify.demographics": "जनसांख्यिकीय (नाम, जन्मतिथि)",
  "identify.submit": "सत्यापित करें और जोड़ें",
  "identify.notImplemented":
    "ABHA सत्यापन वायर्ड है परन्तु ABDM गेटवे के जीवंत होने की प्रतीक्षा में है। आपकी विज़िट जोड़े बिना जारी रहेगी।",
  "identify.skipSuccess": "अस्थायी सत्र के साथ जारी।",

  "encounter.heading": "हमें बताएँ कि आप कैसा महसूस कर रहे हैं",
  "encounter.subheading":
    "बोलें या टैप करें। “यह ग़लत है” कहकर किसी भी उत्तर को बदल सकते हैं।",
  "encounter.placeholder":
    "माइक्रोफ़ोन दबाएँ रखें और अपने लक्षण बताएँ।",
  "encounter.lastHeard": "हमने आपको यह कहते सुना",
  "encounter.wrong": "यह ग़लत है, फिर पूछें",
  "encounter.next": "अगला प्रश्न",
  "encounter.finish": "साक्षात्कार समाप्त करें",
  "encounter.listening": "सुन रहे हैं… भेजने के लिए छोड़ें",
  "encounter.hold": "बोलने के लिए दबाएँ",
  "encounter.processing": "सोच रहे हैं…",
  "encounter.optionsTitle": "या उत्तर टैप करें",
  "encounter.correctTitle": "क्या हमने सही सुना?",
  "encounter.correct.yes": "हाँ, जारी रखें",
  "encounter.correct.no": "नहीं, फिर कोशिश करें",
  "encounter.voiceOnly": "केवल आवाज़",
  "encounter.touchOnly": "केवल टैप",
  "encounter.audioFailed":
    "हम आवाज़ समझ नहीं पाए। कृपया फिर कोशिश करें या उत्तर टैप करें।",

  "redflag.heading": "महत्वपूर्ण — कृपया सुनें",
  "redflag.body":
    "आपके उत्तर बताते हैं कि आपको तुरंत मदद चाहिए। स्टाफ़ को सूचित कर दिया गया है, वे जल्द आ रहे हैं। कृपया कियोस्क पर रुकें।",
  "redflag.confirm": "मैं समझ गया — स्टाफ़ की प्रतीक्षा करूँगा",
  "redflag.notify": "स्टाफ़ को सूचित किया गया",
  "redflag.reason": "हमने क्या देखा",
  "redflag.continueAnyway":
    "यदि आपको यह समस्या नहीं है, तो जारी रखने के लिए टैप करें।",

  "documents.heading": "क्या आपके पास कोई काग़ज़ात हैं?",
  "documents.subheading":
    "पुराने पर्चे, जाँच रिपोर्ट या छुट्टी सारांश डॉक्टर की मदद करते हैं। आप इसे छोड़ भी सकते हैं।",
  "documents.type.prescription": "पर्चा",
  "documents.type.lab_report": "जाँच रिपोर्ट",
  "documents.type.discharge_summary": "छुट्टी सारांश",
  "documents.type.imaging": "इमेजिंग (X-ray, CT, MRI)",
  "documents.capture": "काग़ज़ात कैप्चर करें",
  "documents.retake": "फिर फ़ोटो लें",
  "documents.preview": "ठीक है",
  "documents.uploaded": "काग़ज़ात जोड़ा गया",
  "documents.scanAnother": "और काग़ज़ात स्कैन करें",
  "documents.skip": "मेरे पास कोई काग़ज़ात नहीं है",
  "documents.camera.permission":
    "कृपया कैमरे की अनुमति दें। अनुमति न मिलने पर भी बिना काग़ज़ात के जारी।",
  "documents.camera.fail":
    "कैमरा शुरू नहीं हो सका। आप इस चरण को छोड़ सकते हैं।",
  "documents.guide": "काग़ज़ात को फ्रेम के अंदर रखें",
  "documents.processing": "काग़ज़ात पढ़ रहे हैं…",

  "summary.heading": "यह रहा हमने जो रिकॉर्ड किया",
  "summary.subheading":
    "कृपया अपनी भाषा में पढ़ें। कुछ ग़लत हो तो बताएँ ताकि हम सुधार सकें।",
  "summary.chiefComplaint": "मुख्य शिकायत",
  "summary.history": "आपके उत्तर",
  "summary.documents": "आपके काग़ज़ात",
  "summary.redFlag": "तत्काल ध्यान देने योग्य",
  "summary.readAloud": "पढ़कर सुनाएँ",
  "summary.correct": "यह सही है",
  "summary.fix": "कुछ ग़लत है",
  "summary.print": "प्रिंट करें",
  "summary.qr": "फ़ोन पर देखें",
  "summary.takenAway": "ले-जाने वाला कोड",
  "summary.finalize": "डॉक्टर को भेजें",
  "summary.finalizing": "डॉक्टर को भेज रहे हैं…",
  "summary.thanks": "धन्यवाद। कृपया अपनी सीट लें; डॉक्टर जल्द मिलेंगे।",
  "summary.confirmFinalize.heading": "क्या यह सारांश डॉक्टर को भेजें?",
  "summary.confirmFinalize.body":
    "इसके बाद कियोस्क से आपका डेटा हटा दिया जाएगा। आप इसे फिर यहाँ से बदल नहीं पाएँगे।",
  "summary.confirmFinalize.confirm": "हाँ, डॉक्टर को भेजें",
  "summary.confirmFinalize.cancel": "रुकें, फिर देखता हूँ",

  "error.generic": "कुछ ग़लत हो गया।",
  "error.network": "नेटवर्क उपलब्ध नहीं। आपके उत्तर सहेज लिए गए हैं।",
  "error.retry": "कृपया फिर कोशिश करें।",
  "error.ttsUnavailable":
    "इस ब्राउज़र में आवाज़ उपलब्ध नहीं है। पाठ पढ़ा जा सकता है।",

  "help.heading": "मदद चाहिए?",
  "help.body":
    "स्टाफ़ को सूचित कर दिया गया है। वे एक पल में आपके पास होंगे। कृपया कियोस्क के पास रुकें।",
  "help.called": "मदद बुलाई गई",
  "help.cancel": "मदद रद्द करें",
};

const ta: Dict = {
  "app.title": "வைத்யசேது",
  "app.subtitle": "ஆயுஷ் OPD கியோஸ்க்",
  "app.ministry": "ஆயுஷ் அமைச்சகம், இந்திய அரசு",

  "a11y.textSize": "எழுத்து அளவு",
  "a11y.textSize.comfortable": "வசதியான",
  "a11y.textSize.large": "பெரிய",
  "a11y.textSize.xlarge": "மிகப் பெரிய",
  "a11y.highContrast": "உயர் வேறுபாடு",
  "a11y.audio": "குரல் விளக்கம்",
  "a11y.audio.on": "குரல் ஆன்",
  "a11y.audio.off": "குரல் ஆஃப்",

  "nav.back": "பின்",
  "nav.home": "முகப்பு",
  "nav.help": "உதவி அழை",
  "nav.skip": "தவிர்",
  "nav.continue": "தொடர்க",
  "nav.cancel": "ரத்து",
  "nav.confirm": "உறுதிப்படுத்து",
  "nav.retry": "மீண்டும் முயல்",
  "nav.next": "அடுத்து",

  "step.welcome": "வரவேற்பு",
  "step.consent": "தனியுரிமை",
  "step.identify": "அடையாளம்",
  "step.encounter": "அறிகுறிகள்",
  "step.documents": "ஆவணங்கள்",
  "step.summary": "சுருக்கம்",
  "step.done": "முடிந்தது",
  "step.of": "படி {current} / {total}",

  "online.online": "ஆன்லைன்",
  "online.offline": "ஆஃப்லைன் — உள்ளூரில் சேமிக்கப்பட்டது",

  "welcome.heading": "வைத்யசேதுவுக்கு வரவேற்கிறோம்",
  "welcome.subheading":
    "உங்கள் ஆயுஷ் ஆலோசனைக்கான AI கியோஸ்க். தொடங்க ஒரு மொழியைத் தேர்ந்தெடுக்கவும்.",
  "welcome.chooseLanguage": "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
  "welcome.greeting.hi": "नमस्ते — வரவேற்பு",
  "welcome.greeting.en": "Hello — வரவேற்பு",
  "welcome.greeting.ta": "வணக்கம் — வரவேற்பு",
  "welcome.compliance.ministry": "ஆயுஷ் அமைச்சகத்திற்காக உருவாக்கப்பட்டது",
  "welcome.compliance.abdm": "ABDM இணக்கம்",
  "welcome.compliance.dpdp": "DPDP சட்டம் 2023 இணக்கம்",
  "welcome.compliance.iiit": "AIIA தர வடிவமைப்பு",
  "welcome.start": "தொடங்க தட்டவும்",
  "welcome.preview.hi": "हिन्दी",
  "welcome.preview.en": "English",
  "welcome.preview.ta": "தமிழ்",
  "welcome.preview.sub.hi": "Hindi / Hinglish",
  "welcome.preview.sub.en": "English",
  "welcome.preview.sub.ta": "Tamil / Tanglish",

  "consent.heading": "உங்கள் தனியுரிமை தேர்வுகள்",
  "consent.subheading":
    "ஏதேனும் கேள்விகளைக் கேட்பதற்கு முன், இவற்றைப் பார்த்து முடிவு செய்யுங்கள். இபடியே நீங்கள் மாற்றலாம்.",
  "consent.toggle": "நான் ஒப்புக்கொள்கிறேன்",
  "consent.required": "தொடர தேவை",
  "consent.purpose.clinical": "மருத்துவத் தரவு சேகரிப்பு",
  "consent.purpose.clinical.desc":
    "உங்கள் அறிகுறிகள் மற்றும் வரலாறு பதிவு செய்யப்படும்; மருத்துவர் படிப்பார்.",
  "consent.purpose.abdm": "ABDM சுகாதாரப் பதிவு இணைப்பு",
  "consent.purpose.abdm.desc":
    "விரும்பினால், இந்த வருகையை உங்கள் ஆயுஷ்மான் பாரத் (ABHA) ID உடன் இணைக்கலாம்.",
  "consent.purpose.physician": "மருத்துவருடன் பகிர்வு",
  "consent.purpose.physician.desc":
    "உங்கள் சுருக்கம் நீங்கள் சந்திக்கும் மருத்துவருக்குக் காட்டப்படும்.",
  "consent.purpose.storage": "இந்த வருகைக்கு மட்டும் சேமிப்பு",
  "consent.purpose.storage.desc":
    "வருகை முடியும் வரை உங்கள் தரவு வைக்கப்படும்; பின் அழிக்கப்படும்.",
  "consent.playAudio": "இதை ஒலிப்பதிவாக படி",
  "consent.review": "பார்த்து தொடர்க",
  "consent.requiredError":
    "தொடர தேவையான ஒப்புதலை (மருத்துவத் தரவு) வழங்கவும்.",

  "identify.heading": "உங்களை அறிமுகப்படுத்துங்கள்",
  "identify.subheading":
    "ABHA இல்லாமலும் தொடரலாம். ஆலோசனைக்குப் பிறகு தரவு அழிக்கப்படும்.",
  "identify.linkAbha": "என் ABHA எண்ணை இணை",
  "identify.linkAbha.desc":
    "பரிந்துரைக்கப்படுகிறது. பழைய பதிவுகள் ABDM இலிருந்து பெறப்படும்.",
  "identify.continueAnon": "ABHA இல்லாமல் தொடர்க",
  "identify.continueAnon.desc":
    "தற்காலிக அமர்வு டோக்கன் பெறப்படும். தேசிய ID இணைக்கப்படாது.",
  "identify.abhaLabel": "ABHA எண் (14 இலக்கங்கள்)",
  "identify.abhaPlaceholder": "12-3456-7890-1234",
  "identify.abhaHelp": "இதை ABHM அட்டை / செயலியில் காணலாம்.",
  "identify.method": "சரிபார்ப்பு முறை",
  "verify.aadhaar_otp": "ஆதார் OTP",
  "verify.mobile_otp": "மொபைல் OTP",
  "verify.demographics": "பெயர், பிறந்த தேதி",
  "identify.submit": "சரிபார்த்து இணை",
  "identify.notImplemented":
    "ABHA சரிபார்ப்பு இணைக்கப்பட்டுள்ளது; ABDM நேரலைக்காகக் காத்திருக்கிறது.",
  "identify.skipSuccess": "தற்காலிக அமர்வுடன் தொடர்கிறது.",

  "encounter.heading": "நீங்கள் எப்படி உணர்கிறீர்கள் என்று சொல்லுங்கள்",
  "encounter.subheading":
    "பேசுங்கள் அல்லது தட்டுங்கள். “அது தவறு” என்று சொல்லி மாற்றலாம்.",
  "encounter.placeholder":
    "மைக்கை அழுத்திப் பிடித்து அறிகுறிகளைச் சொல்லுங்கள்.",
  "encounter.lastHeard": "நாங்கள் கேட்டது",
  "encounter.wrong": "அது தவறு, மீண்டும் கேள்",
  "encounter.next": "அடுத்த கேள்வி",
  "encounter.finish": "நேர்காணலை முடி",
  "encounter.listening": "கேட்கிறது… அனுப்ப விடுங்கள்",
  "encounter.hold": "பேச அழுத்து",
  "encounter.processing": "சிந்திக்கிறது…",
  "encounter.optionsTitle": "அல்லது பதிலைத் தட்டவும்",
  "encounter.correctTitle": "சரியாகக் கேட்டோமா?",
  "encounter.correct.yes": "ஆம், தொடர்க",
  "encounter.correct.no": "இல்லை, மீண்டும் முயல்",
  "encounter.voiceOnly": "குரல் மட்டும்",
  "encounter.touchOnly": "தட்டல் மட்டும்",
  "encounter.audioFailed":
    "ஒலியைப் புரிந்துகொள்ள முடியவில்லை. மீண்டும் முயலவும் அல்லது பதிலைத் தட்டவும்.",

  "redflag.heading": "முக்கியம் — கேளுங்கள்",
  "redflag.body":
    "உங்கள் பதில்கள் அவசர கவனிப்பு தேவை என்று காட்டுகின்றன. ஊழியர்களுக்குத் தெரிவிக்கப்பட்டது, விரைவில் வருவார்கள்.",
  "redflag.confirm": "புரிந்தது — ஊழியர்களை எதிர்பார்க்கிறேன்",
  "redflag.notify": "ஊழியர்களுக்குத் தெரிவிக்கப்பட்டது",
  "redflag.reason": "நாங்கள் கவனித்தது",
  "redflag.continueAnyway":
    "இந்தப் பிரச்சனை இல்லை என்றால் தொடர தட்டவும்.",

  "documents.heading": "ஆவணங்கள் ஏதாவது உள்ளதா?",
  "documents.subheading":
    "பழைய மருந்துச் சீட்டுகள், ஆய்வு அறிக்கைகள் உதவும். இந்தப் படியைத் தவிர்க்கலாம்.",
  "documents.type.prescription": "மருந்துச் சீட்டு",
  "documents.type.lab_report": "ஆய்வு அறிக்கை",
  "documents.type.discharge_summary": "டிஸ்சார்ஜ் சுருக்கம்",
  "documents.type.imaging": "இமேஜிங் (X-ray, CT, MRI)",
  "documents.capture": "ஆவணத்தைப் பிடி",
  "documents.retake": "மீண்டும் புகைப்படம்",
  "documents.preview": "சரியாக உள்ளது",
  "documents.uploaded": "ஆவணம் சேர்க்கப்பட்டது",
  "documents.scanAnother": "மற்றொரு ஆவணத்தை ஸ்கேன் செய்",
  "documents.skip": "ஆவணங்கள் இல்லை",
  "documents.camera.permission":
    "கேமரா அனுமதியை வழங்கவும். இல்லையென்றாலும் தொடரலாம்.",
  "documents.camera.fail":
    "கேமரா தொடங்க இயலவில்லை. இந்தப் படியைத் தவிர்க்கலாம்.",
  "documents.guide": "ஆவணத்தை சட்டகத்தினுள் வைக்கவும்",
  "documents.processing": "ஆவணம் படிக்கப்படுகிறது…",

  "summary.heading": "நாங்கள் பதிவு செய்தது இதோ",
  "summary.subheading":
    "உங்கள் மொழியில் படியுங்கள். தவறு இருந்தால் சொல்லுங்கள்.",
  "summary.chiefComplaint": "முக்கிய புகார்",
  "summary.history": "உங்கள் பதில்கள்",
  "summary.documents": "உங்கள் ஆவணங்கள்",
  "summary.redFlag": "அவசர கவனிப்பு",
  "summary.readAloud": "ஒலியாக படி",
  "summary.correct": "இது சரி",
  "summary.fix": "ஏதோ தவறு",
  "summary.print": "அச்சிடு",
  "summary.qr": "தொலைபேசியில் பார்",
  "summary.takenAway": "கொண்டு செல்ல குறியீடு",
  "summary.finalize": "மருத்துவருக்கு அனுப்பு",
  "summary.finalizing": "அனுப்புகிறது…",
  "summary.thanks": "நன்றி. இருக்கையில் அமரவும்; மருத்துவர் விரைவில் வருவார்.",
  "summary.confirmFinalize.heading": "இந்தச் சுருக்கத்தை மருத்துவருக்கு அனுப்பலாமா?",
  "summary.confirmFinalize.body":
    "இதன்பிறகு கியோஸ்க்கில் உங்கள் தரவு அழிக்கப்படும். இங்கிருந்து மாற்ற இயலாது.",
  "summary.confirmFinalize.confirm": "ஆம், அனுப்பு",
  "summary.confirmFinalize.cancel": "காத்திரு, மீண்டும் பார்",

  "error.generic": "ஏதோ தவறு நிகழ்ந்தது.",
  "error.network": "பிணையம் கிடைக்கவில்லை. பதில்கள் சேமிக்கப்பட்டன.",
  "error.retry": "மீண்டும் முயலவும்.",
  "error.ttsUnavailable":
    "இந்த உலாவியில் குரல் கிடைக்கவில்லை. உரம் படிக்கலாம்.",

  "help.heading": "உதவி வேண்டுமா?",
  "help.body":
    "ஊழியர்களுக்குத் தெரிவிக்கப்பட்டது. ஒரு நிமிடத்தில் வருவார்கள்.",
  "help.called": "உதவி அழைக்கப்பட்டது",
  "help.cancel": "உதவியை ரத்து செய்",
};

const dictionaries: Record<SupportedLanguage, Dict> = { en, hi, ta };

/**
 * Returns a localized string for the given language.
 * Falls back to English if the key is missing in the chosen language,
 * so screens never render raw keys.
 */
export function t(
  lang: SupportedLanguage,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const dict = dictionaries[lang] ?? en;
  const fallback = en[key] ?? key;
  let value = dict[key] ?? fallback;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.split(`{${k}}`).join(String(v));
    }
  }
  return value;
}

/**
 * Strips diacritics and lower-cases the language string for safe
 * comparison (e.g. while matching Sarvam / browser STT voices).
 */
export function normalizeLangTag(lang: SupportedLanguage): string {
  return lang.toLowerCase();
}

/**
 * Narrows a free-form input string to one of our supported languages.
 * Used when reading values out of the persisted Zustand store or query
 * strings at the route boundary.
 */
export function coerceSupportedLanguage(
  raw: string | null | undefined,
): SupportedLanguage {
  if (raw === "en" || raw === "hi" || raw === "ta") return raw;
  return "hi";
}