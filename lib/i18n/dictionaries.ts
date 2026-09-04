export const en = {
  welcome: {
    title: "Welcome to VaidyaSetu",
    subtitle: "Your digital health assistant",
    beginButton: "Tap to Begin",
    trustBadges: {
      ayush: "AYUSH Certified",
      abdm: "ABDM Compliant",
      dpdp: "Data Privacy Protected"
    }
  },
  languages: {
    hindi: "हिन्दी",
    english: "English",
    tamil: "தமிழ்"
  },
  consent: {
    title: "Your Privacy Matters",
    subtitle: "Please review how we use your information",
    purposes: {
      clinical_data_collection: {
        label: "Health Data Collection",
        description: "We collect your health details to help the doctor treat you."
      },
      abdm_health_record_linking: {
        label: "Link Health Records",
        description: "We safely connect your previous health records using ABDM."
      },
      data_sharing_with_physician: {
        label: "Share with Doctor",
        description: "Your health details are shared only with your treating doctor."
      },
      temporary_storage: {
        label: "Temporary Storage",
        description: "Your data is removed from this kiosk after your visit."
      }
    },
    continueButton: "I Agree, Continue",
    requiredLabel: "Required"
  },
  identify: {
    title: "Who are you?",
    subtitle: "Tell us how to find your details",
    abhaPath: {
      title: "Use ABHA ID",
      placeholder: "Enter ABHA Number",
      verifyButton: "Verify"
    },
    guestPath: {
      title: "Continue without ABHA",
      description: "You can create an ABHA ID later.",
      continueButton: "Continue as Guest"
    },
    skipLabel: "Skip for now"
  },
  encounter: {
    holdToSpeak: "Hold to Speak",
    listening: "Listening...",
    processing: "Thinking...",
    weHeard: "We heard:",
    correct: "Correct",
    tryAgain: "Try Again",
    thatsNotRight: "That's not right",
    nextQuestion: "Next Question",
    stageLabels: {
      chief_complaint: "Main Problem",
      hpi: "History of Present Illness",
      past_history: "Past Health",
      drug_allergy: "Allergies",
      family_history: "Family Health",
      personal_history: "Personal Habits",
      ros: "Body Check",
      ayush_extended: "AYUSH Details",
      complete: "Done"
    }
  },
  documentScan: {
    title: "Scan Documents",
    subtitle: "Show us your previous medical papers",
    capture: "Take Photo",
    retake: "Retake",
    usePhoto: "Use this Photo",
    docTypes: {
      prescription: "Prescription",
      lab_report: "Lab Report",
      discharge_summary: "Discharge Summary",
      imaging: "Scan / X-ray"
    },
    skipButton: "Skip Scanning",
    uploadingLabel: "Uploading..."
  },
  summary: {
    title: "Your Summary",
    subtitle: "Here is what we gathered. Is it correct?",
    correctButton: "Yes, this is correct",
    wrongButton: "No, change it",
    thankYou: "Thank you!",
    doctorReview: "The doctor will review this shortly.",
    qrLabel: "Scan to keep a copy"
  },
  redFlag: {
    title: "Emergency Noticed",
    staffNotified: "We have told the clinic staff.",
    waitHere: "Please wait here. Help is coming.",
    reason: "Because of:"
  },
  accessibility: {
    textSize: "Text Size",
    highContrast: "High Contrast",
    audioToggle: "Read out loud",
    increase: "Bigger",
    decrease: "Smaller"
  },
  nav: {
    back: "Back",
    home: "Start Over",
    callForHelp: "Help",
    homeConfirmTitle: "Start Over?",
    homeConfirmMessage: "Are you sure? You will lose what you entered so far."
  },
  sync: {
    online: "Connected",
    offline: "No Internet",
    pendingCount: "Waiting to sync"
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    networkError: "Check your internet connection.",
    micPermission: "We need microphone access to hear you.",
    cameraPermission: "We need camera access to take pictures.",
    tryAgain: "Try Again"
  },
  common: {
    yes: "Yes",
    no: "No",
    cancel: "Cancel",
    continue: "Continue",
    submit: "Submit",
    loading: "Loading...",
    step: "Step",
    of: "of"
  }
} as const;

export const hi = {
  welcome: {
    title: "वैद्यसेतु में आपका स्वागत है",
    subtitle: "आपका डिजिटल स्वास्थ्य सहायक",
    beginButton: "शुरू करने के लिए यहाँ दबाएं",
    trustBadges: {
      ayush: "आयुष प्रमाणित",
      abdm: "एबीडीएम (ABDM) मान्य",
      dpdp: "डेटा सुरक्षा सुरक्षित"
    }
  },
  languages: {
    hindi: "हिन्दी",
    english: "English",
    tamil: "தமிழ்"
  },
  consent: {
    title: "आपकी गोपनीयता महत्वपूर्ण है",
    subtitle: "कृपया देखें कि हम आपकी जानकारी का उपयोग कैसे करते हैं",
    purposes: {
      clinical_data_collection: {
        label: "स्वास्थ्य जानकारी",
        description: "डॉक्टर के इलाज में मदद के लिए हम आपके स्वास्थ्य की जानकारी लेते हैं।"
      },
      abdm_health_record_linking: {
        label: "पुराने रिकॉर्ड जोड़ें",
        description: "हम ABDM की मदद से आपके पुराने रिकॉर्ड सुरक्षित रूप से जोड़ते हैं।"
      },
      data_sharing_with_physician: {
        label: "डॉक्टर को बताएं",
        description: "आपकी स्वास्थ्य जानकारी केवल आपके डॉक्टर को दी जाएगी।"
      },
      temporary_storage: {
        label: "अस्थायी रूप से रखना",
        description: "आपके जाने के बाद आपका डेटा इस मशीन से हटा दिया जाएगा।"
      }
    },
    continueButton: "मैं सहमत हूँ, आगे बढ़ें",
    requiredLabel: "जरूरी"
  },
  identify: {
    title: "आप कौन हैं?",
    subtitle: "हमें बताएं कि हम आपकी जानकारी कैसे खोजें",
    abhaPath: {
      title: "आभा (ABHA) आईडी का उपयोग करें",
      placeholder: "आभा (ABHA) नंबर दर्ज करें",
      verifyButton: "जांच करें"
    },
    guestPath: {
      title: "बिना आभा (ABHA) के आगे बढ़ें",
      description: "आप बाद में आभा (ABHA) आईडी बना सकते हैं।",
      continueButton: "मेहमान के रूप में जारी रखें"
    },
    skipLabel: "अभी छोड़ें"
  },
  encounter: {
    holdToSpeak: "बोलने के लिए दबाकर रखें",
    listening: "सुन रहे हैं...",
    processing: "सोच रहे हैं...",
    weHeard: "हमने सुना:",
    correct: "सही है",
    tryAgain: "फिर से प्रयास करें",
    thatsNotRight: "यह सही नहीं है",
    nextQuestion: "अगला सवाल",
    stageLabels: {
      chief_complaint: "मुख्य समस्या",
      hpi: "बीमारी का इतिहास",
      past_history: "पिछला स्वास्थ्य",
      drug_allergy: "एलर्जी",
      family_history: "परिवार का स्वास्थ्य",
      personal_history: "व्यक्तिगत आदतें",
      ros: "शरीर की जांच",
      ayush_extended: "आयुष जानकारी",
      complete: "हो गया"
    }
  },
  documentScan: {
    title: "दस्तावेज़ स्कैन करें",
    subtitle: "हमें अपने पुराने मेडिकल कागज़ दिखाएं",
    capture: "फोटो लें",
    retake: "फिर से लें",
    usePhoto: "इस फोटो का उपयोग करें",
    docTypes: {
      prescription: "पर्चा (Prescription)",
      lab_report: "लैब रिपोर्ट",
      discharge_summary: "डिस्चार्ज समरी",
      imaging: "स्कैन / एक्स-रे"
    },
    skipButton: "स्कैन करना छोड़ें",
    uploadingLabel: "अपलोड हो रहा है..."
  },
  summary: {
    title: "आपका विवरण",
    subtitle: "हमने यह जानकारी जमा की है। क्या यह सही है?",
    correctButton: "हाँ, यह सही है",
    wrongButton: "नहीं, इसे बदलें",
    thankYou: "धन्यवाद!",
    doctorReview: "डॉक्टर जल्द ही इसकी जांच करेंगे।",
    qrLabel: "कॉपी रखने के लिए स्कैन करें"
  },
  redFlag: {
    title: "आपात स्थिति",
    staffNotified: "हमने क्लिनिक के कर्मचारियों को बता दिया है।",
    waitHere: "कृपया यहाँ प्रतीक्षा करें। मदद आ रही है।",
    reason: "कारण:"
  },
  accessibility: {
    textSize: "टेक्स्ट का आकार",
    highContrast: "अधिक स्पष्ट (High Contrast)",
    audioToggle: "बोलकर सुनाएं",
    increase: "बड़ा करें",
    decrease: "छोटा करें"
  },
  nav: {
    back: "पीछे",
    home: "शुरू से शुरू करें",
    callForHelp: "मदद",
    homeConfirmTitle: "शुरू से शुरू करें?",
    homeConfirmMessage: "क्या आप वाकई ऐसा करना चाहते हैं? आपकी दर्ज की गई जानकारी मिट जाएगी।"
  },
  sync: {
    online: "जुड़ा हुआ",
    offline: "इंटरनेट नहीं है",
    pendingCount: "सिंक होने का इंतज़ार है"
  },
  errors: {
    generic: "कुछ गलत हो गया। कृपया फिर से प्रयास करें।",
    networkError: "अपना इंटरनेट कनेक्शन जांचें।",
    micPermission: "आपकी आवाज़ सुनने के लिए हमें माइक्रोफ़ोन की ज़रूरत है।",
    cameraPermission: "फोटो लेने के लिए हमें कैमरे की ज़रूरत है।",
    tryAgain: "फिर से प्रयास करें"
  },
  common: {
    yes: "हाँ",
    no: "नहीं",
    cancel: "रद्द करें",
    continue: "आगे बढ़ें",
    submit: "जमा करें",
    loading: "लोड हो रहा है...",
    step: "कदम",
    of: "में से"
  }
} as const;

export const ta = {
  welcome: {
    title: "VaidyaSetu-க்கு உங்களை வரவேற்கிறோம்",
    subtitle: "உங்கள் டிஜிட்டல் சுகாதார உதவியாளர்",
    beginButton: "தொடங்க இங்கே தொடவும்",
    trustBadges: {
      ayush: "AYUSH சான்றிதழ் பெற்றது",
      abdm: "ABDM அங்கீகாரம்",
      dpdp: "தரவு பாதுகாப்பு"
    }
  },
  languages: {
    hindi: "हिन्दी",
    english: "English",
    tamil: "தமிழ்"
  },
  consent: {
    title: "உங்கள் தனியுரிமை முக்கியமானது",
    subtitle: "உங்கள் தகவல்களை நாங்கள் எவ்வாறு பயன்படுத்துகிறோம் என்பதைப் பார்க்கவும்",
    purposes: {
      clinical_data_collection: {
        label: "சுகாதார தரவு சேகரிப்பு",
        description: "மருத்துவர் உங்களுக்கு சிகிச்சையளிக்க உதவ, உங்கள் சுகாதார விவரங்களை நாங்கள் சேகரிக்கிறோம்."
      },
      abdm_health_record_linking: {
        label: "சுகாதார பதிவுகளை இணைக்கவும்",
        description: "ABDM ஐப் பயன்படுத்தி உங்கள் பழைய சுகாதார பதிவுகளை நாங்கள் பாதுகாப்பாக இணைக்கிறோம்."
      },
      data_sharing_with_physician: {
        label: "மருத்துவருடன் பகிரவும்",
        description: "உங்கள் சுகாதார விவரங்கள் உங்களுக்கு சிகிச்சையளிக்கும் மருத்துவருடன் மட்டுமே பகிரப்படும்."
      },
      temporary_storage: {
        label: "தற்காலிக சேமிப்பு",
        description: "உங்கள் வருகைக்குப் பிறகு உங்கள் தரவு இந்த இயந்திரத்திலிருந்து அகற்றப்படும்."
      }
    },
    continueButton: "நான் ஏற்கிறேன், தொடரவும்",
    requiredLabel: "தேவை"
  },
  identify: {
    title: "நீங்கள் யார்?",
    subtitle: "உங்கள் விவரங்களை எவ்வாறு கண்டறிவது என்று எங்களிடம் கூறுங்கள்",
    abhaPath: {
      title: "ABHA ஐடியைப் பயன்படுத்தவும்",
      placeholder: "ABHA எண்ணை உள்ளிடவும்",
      verifyButton: "சரிபார்க்கவும்"
    },
    guestPath: {
      title: "ABHA இல்லாமல் தொடரவும்",
      description: "நீங்கள் பின்னர் ஒரு ABHA ஐடியை உருவாக்கலாம்.",
      continueButton: "விருந்தினராக தொடரவும்"
    },
    skipLabel: "தவிர்க்கவும்"
  },
  encounter: {
    holdToSpeak: "பேச அழுத்திப் பிடிக்கவும்",
    listening: "கேட்கிறது...",
    processing: "சிந்திக்கிறது...",
    weHeard: "நாங்கள் கேட்டது:",
    correct: "சரி",
    tryAgain: "மீண்டும் முயற்சிக்கவும்",
    thatsNotRight: "அது சரியல்ல",
    nextQuestion: "அடுத்த கேள்வி",
    stageLabels: {
      chief_complaint: "முக்கிய பிரச்சனை",
      hpi: "தற்போதைய நோயின் வரலாறு",
      past_history: "கடந்த கால உடல்நலம்",
      drug_allergy: "ஒவ்வாமைகள்",
      family_history: "குடும்ப உடல்நலம்",
      personal_history: "தனிப்பட்ட பழக்கவழக்கங்கள்",
      ros: "உடல் பரிசோதனை",
      ayush_extended: "AYUSH விவரங்கள்",
      complete: "முடிந்தது"
    }
  },
  documentScan: {
    title: "ஆவணங்களை ஸ்கேன் செய்யவும்",
    subtitle: "உங்கள் பழைய மருத்துவ ஆவணங்களை எங்களிடம் காட்டுங்கள்",
    capture: "புகைப்படம் எடுக்கவும்",
    retake: "மீண்டும் எடுக்கவும்",
    usePhoto: "இந்தப் புகைப்படத்தைப் பயன்படுத்தவும்",
    docTypes: {
      prescription: "மருந்து சீட்டு",
      lab_report: "ஆய்வக அறிக்கை",
      discharge_summary: "டிஸ்சார்ஜ் சுருக்கம்",
      imaging: "ஸ்கேன் / எக்ஸ்-ரே"
    },
    skipButton: "ஸ்கேன் செய்வதைத் தவிர்க்கவும்",
    uploadingLabel: "பதிவேற்றப்படுகிறது..."
  },
  summary: {
    title: "உங்கள் சுருக்கம்",
    subtitle: "நாங்கள் சேகரித்தவை இங்கே. இது சரியா?",
    correctButton: "ஆம், இது சரி",
    wrongButton: "இல்லை, அதை மாற்றவும்",
    thankYou: "நன்றி!",
    doctorReview: "மருத்துவர் இதை விரைவில் மதிப்பாய்வு செய்வார்.",
    qrLabel: "நகலை வைத்திருக்க ஸ்கேன் செய்யவும்"
  },
  redFlag: {
    title: "அவசர நிலை அறியப்பட்டது",
    staffNotified: "நாங்கள் கிளினிக் ஊழியர்களுக்குத் தெரிவித்துள்ளோம்.",
    waitHere: "தயவுசெய்து இங்கே காத்திருங்கள். உதவி வருகிறது.",
    reason: "காரணம்:"
  },
  accessibility: {
    textSize: "உரை அளவு",
    highContrast: "அதிக வேறுபாடு",
    audioToggle: "படித்துக் காட்டவும்",
    increase: "பெரிதாக்கு",
    decrease: "சிறிதாக்கு"
  },
  nav: {
    back: "பின் செல்ல",
    home: "மீண்டும் தொடங்க",
    callForHelp: "உதவி",
    homeConfirmTitle: "மீண்டும் தொடங்கவா?",
    homeConfirmMessage: "உறுதியாகவா? நீங்கள் இதுவரை உள்ளிட்டவற்றை இழக்க நேரிடும்."
  },
  sync: {
    online: "இணைக்கப்பட்டுள்ளது",
    offline: "இணையம் இல்லை",
    pendingCount: "ஒத்திசைக்க காத்திருக்கிறது"
  },
  errors: {
    generic: "ஏதோ தவறு நடந்துவிட்டது. மீண்டும் முயற்சிக்கவும்.",
    networkError: "உங்கள் இணைய இணைப்பை சரிபார்க்கவும்.",
    micPermission: "நீங்கள் சொல்வதைக் கேட்க எங்களுக்கு மைக்ரோஃபோன் அணுகல் தேவை.",
    cameraPermission: "புகைப்படங்கள் எடுக்க எங்களுக்கு கேமரா அணுகல் தேவை.",
    tryAgain: "மீண்டும் முயற்சிக்கவும்"
  },
  common: {
    yes: "ஆம்",
    no: "இல்லை",
    cancel: "ரத்து செய்",
    continue: "தொடரவும்",
    submit: "சமர்ப்பிக்கவும்",
    loading: "ஏற்றப்படுகிறது...",
    step: "படி",
    of: "இல்"
  }
} as const;
