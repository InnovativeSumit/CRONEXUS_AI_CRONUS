"""
CropNexus — i18n (English / Bengali / Hindi)

Covers the app's UI chrome — navigation, buttons, headings, form labels,
landing/login/signup copy. The ML models' own output (crop names, disease
names, agronomic guidance text from the JSON knowledge base) stays in
English, since machine-translating domain-specific agricultural advice
reliably is out of scope here — see the README for more on this.
"""

LANGUAGES = {
    "en": "English",
    "bn": "বাংলা",
    "hi": "हिन्दी",
}
DEFAULT_LANGUAGE = "en"

_EN = {
    "nav_home": "Home",
    "nav_advisory": "Crop Advisory",
    "nav_leaf": "Leaf Disease",
    "nav_history": "History",
    "nav_about": "About Model",
    "nav_login": "Log In",
    "nav_signup": "Sign Up",
    "nav_logout": "Log Out",
    "nav_hello": "Hi",

    "landing_eyebrow": "AI/ML Farmer Advisory System",
    "landing_title_1": "Grow smarter with",
    "landing_lead": "Tell us your soil nutrients, location and weather conditions — our trained ML model recommends the best crop to grow, along with fertilizer guidance, an irrigation plan, and AI-powered leaf disease detection.",
    "landing_get_started": "Get Started — It's Free",
    "landing_login_cta": "I already have an account",
    "landing_features_title": "How CropNexus helps you",

    "auth_login_title": "Welcome back",
    "auth_login_subtitle": "Log in to get your crop advisory and leaf health scans.",
    "auth_signup_title": "Create your account",
    "auth_signup_subtitle": "Takes less than a minute — no card, no spam.",
    "auth_name": "Full Name",
    "auth_email": "Email",
    "auth_password": "Password",
    "auth_login_button": "Log In",
    "auth_signup_button": "Create Account",
    "auth_no_account": "Don't have an account?",
    "auth_have_account": "Already have an account?",
    "auth_signup_link": "Sign up",
    "auth_login_link": "Log in",

    "home_title": "Grow smarter with",
    "home_lead": "Tell us your soil nutrients, location and weather conditions — our trained ML model recommends the best crop to grow, along with fertilizer guidance, an irrigation plan, and AI-powered leaf disease detection.",
    "home_cta_advisory": "Get Crop Advisory →",
    "home_cta_leaf": "Detect Leaf Disease",
    "home_stat_accuracy": "Model Accuracy",
    "home_stat_crops": "Crops Supported",
    "home_stat_model": "Best Model",

    "advisory_eyebrow": "Step into the field",
    "advisory_title": "Tell us about your field",
    "advisory_subtitle": "Enter your soil and weather readings below. All fields are used by the model to recommend the best crop.",
    "advisory_location": "Location",
    "advisory_soil_type": "Soil Type",
    "advisory_nutrients": "Soil Nutrients (kg/ha)",
    "advisory_climate": "Climate Conditions",
    "advisory_submit": "Analyze & Recommend →",
    "advisory_fill_example": "Fill Example Values",

    "leaf_eyebrow": "AI leaf scan",
    "leaf_title": "Leaf Disease Detection",
    "leaf_subtitle": "Upload a clear photo of a single leaf. Our trained CNN identifies the disease (or confirms it's healthy) and gives you a curing plan.",
    "leaf_upload_label": "Leaf Photo",
    "leaf_detect_button": "Detect Disease →",

    "history_eyebrow": "Your past requests",
    "history_title": "Advisory History",
    "history_subtitle": "All advisories are saved so you can revisit past recommendations.",

    "about_eyebrow": "Under the hood",
    "about_title": "About the Models",

    "footer_tagline": "AI-powered crop, fertilizer & irrigation advisory for every farmer.",
    "footer_built_for": "Built for academic demonstration — AI/ML Project",
    "language_label": "Language",
}

_BN = {
    "nav_home": "হোম",
    "nav_advisory": "ফসল পরামর্শ",
    "nav_leaf": "পাতার রোগ",
    "nav_history": "ইতিহাস",
    "nav_about": "মডেল সম্পর্কে",
    "nav_login": "লগ ইন",
    "nav_signup": "সাইন আপ",
    "nav_logout": "লগ আউট",
    "nav_hello": "হ্যালো",

    "landing_eyebrow": "এআই/এমএল কৃষক পরামর্শ ব্যবস্থা",
    "landing_title_1": "আরও স্মার্টভাবে চাষ করুন",
    "landing_lead": "আপনার মাটির পুষ্টি, অবস্থান এবং আবহাওয়ার তথ্য দিন — আমাদের প্রশিক্ষিত মডেল সেরা ফসল, সার নির্দেশিকা, সেচ পরিকল্পনা এবং এআই-চালিত পাতার রোগ শনাক্তকরণের পরামর্শ দেয়।",
    "landing_get_started": "শুরু করুন — বিনামূল্যে",
    "landing_login_cta": "আমার আগে থেকেই অ্যাকাউন্ট আছে",
    "landing_features_title": "CropNexus আপনাকে যেভাবে সাহায্য করে",

    "auth_login_title": "আবার স্বাগতম",
    "auth_login_subtitle": "ফসলের পরামর্শ ও পাতার স্বাস্থ্য স্ক্যান পেতে লগ ইন করুন।",
    "auth_signup_title": "আপনার অ্যাকাউন্ট তৈরি করুন",
    "auth_signup_subtitle": "এক মিনিটেরও কম সময় লাগবে — কোনো কার্ড বা স্প্যাম নেই।",
    "auth_name": "পুরো নাম",
    "auth_email": "ইমেইল",
    "auth_password": "পাসওয়ার্ড",
    "auth_login_button": "লগ ইন",
    "auth_signup_button": "অ্যাকাউন্ট তৈরি করুন",
    "auth_no_account": "অ্যাকাউন্ট নেই?",
    "auth_have_account": "আগে থেকেই অ্যাকাউন্ট আছে?",
    "auth_signup_link": "সাইন আপ করুন",
    "auth_login_link": "লগ ইন করুন",

    "home_title": "আরও স্মার্টভাবে চাষ করুন",
    "home_lead": "আপনার মাটির পুষ্টি, অবস্থান এবং আবহাওয়ার তথ্য দিন — আমাদের প্রশিক্ষিত মডেল সেরা ফসল, সার নির্দেশিকা, সেচ পরিকল্পনা এবং এআই-চালিত পাতার রোগ শনাক্তকরণের পরামর্শ দেয়।",
    "home_cta_advisory": "ফসল পরামর্শ নিন →",
    "home_cta_leaf": "পাতার রোগ শনাক্ত করুন",
    "home_stat_accuracy": "মডেলের নির্ভুলতা",
    "home_stat_crops": "সমর্থিত ফসল",
    "home_stat_model": "সেরা মডেল",

    "advisory_eyebrow": "মাঠের তথ্য দিন",
    "advisory_title": "আপনার জমি সম্পর্কে বলুন",
    "advisory_subtitle": "নিচে আপনার মাটি ও আবহাওয়ার তথ্য দিন। এই সব তথ্য দিয়ে মডেল সেরা ফসল নির্বাচন করবে।",
    "advisory_location": "অবস্থান",
    "advisory_soil_type": "মাটির ধরন",
    "advisory_nutrients": "মাটির পুষ্টি উপাদান (কেজি/হেক্টর)",
    "advisory_climate": "আবহাওয়ার অবস্থা",
    "advisory_submit": "বিশ্লেষণ করে পরামর্শ দিন →",
    "advisory_fill_example": "উদাহরণ মান পূরণ করুন",

    "leaf_eyebrow": "এআই পাতা স্ক্যান",
    "leaf_title": "পাতার রোগ শনাক্তকরণ",
    "leaf_subtitle": "একটি পাতার স্পষ্ট ছবি আপলোড করুন। আমাদের প্রশিক্ষিত মডেল রোগ শনাক্ত করে (অথবা সুস্থ কিনা তা নিশ্চিত করে) এবং প্রতিকারের পরিকল্পনা দেয়।",
    "leaf_upload_label": "পাতার ছবি",
    "leaf_detect_button": "রোগ শনাক্ত করুন →",

    "history_eyebrow": "আপনার আগের অনুরোধসমূহ",
    "history_title": "পরামর্শের ইতিহাস",
    "history_subtitle": "সব পরামর্শ সংরক্ষিত থাকে যাতে আপনি পরে আবার দেখতে পারেন।",

    "about_eyebrow": "ভিতরের প্রযুক্তি",
    "about_title": "মডেল সম্পর্কে",

    "footer_tagline": "প্রতিটি কৃষকের জন্য এআই-চালিত ফসল, সার ও সেচ পরামর্শ।",
    "footer_built_for": "একাডেমিক প্রদর্শনের জন্য তৈরি — এআই/এমএল প্রকল্প",
    "language_label": "ভাষা",
}

_HI = {
    "nav_home": "होम",
    "nav_advisory": "फ़सल सलाह",
    "nav_leaf": "पत्ती रोग",
    "nav_history": "इतिहास",
    "nav_about": "मॉडल के बारे में",
    "nav_login": "लॉग इन",
    "nav_signup": "साइन अप",
    "nav_logout": "लॉग आउट",
    "nav_hello": "नमस्ते",

    "landing_eyebrow": "एआई/एमएल किसान सलाहकार प्रणाली",
    "landing_title_1": "स्मार्ट तरीके से खेती करें",
    "landing_lead": "अपनी मिट्टी के पोषक तत्व, स्थान और मौसम की जानकारी दें — हमारा प्रशिक्षित मॉडल सबसे अच्छी फ़सल, उर्वरक मार्गदर्शन, सिंचाई योजना और एआई-आधारित पत्ती रोग पहचान की सलाह देता है।",
    "landing_get_started": "शुरू करें — बिल्कुल मुफ़्त",
    "landing_login_cta": "मेरा खाता पहले से है",
    "landing_features_title": "CropNexus आपकी कैसे मदद करता है",

    "auth_login_title": "वापसी पर स्वागत है",
    "auth_login_subtitle": "फ़सल सलाह और पत्ती स्वास्थ्य स्कैन पाने के लिए लॉग इन करें।",
    "auth_signup_title": "अपना खाता बनाएं",
    "auth_signup_subtitle": "एक मिनट से भी कम समय लगेगा — कोई कार्ड या स्पैम नहीं।",
    "auth_name": "पूरा नाम",
    "auth_email": "ईमेल",
    "auth_password": "पासवर्ड",
    "auth_login_button": "लॉग इन",
    "auth_signup_button": "खाता बनाएं",
    "auth_no_account": "खाता नहीं है?",
    "auth_have_account": "पहले से खाता है?",
    "auth_signup_link": "साइन अप करें",
    "auth_login_link": "लॉग इन करें",

    "home_title": "स्मार्ट तरीके से खेती करें",
    "home_lead": "अपनी मिट्टी के पोषक तत्व, स्थान और मौसम की जानकारी दें — हमारा प्रशिक्षित मॉडल सबसे अच्छी फ़सल, उर्वरक मार्गदर्शन, सिंचाई योजना और एआई-आधारित पत्ती रोग पहचान की सलाह देता है।",
    "home_cta_advisory": "फ़सल सलाह लें →",
    "home_cta_leaf": "पत्ती रोग पहचानें",
    "home_stat_accuracy": "मॉडल सटीकता",
    "home_stat_crops": "समर्थित फ़सलें",
    "home_stat_model": "सर्वश्रेष्ठ मॉडल",

    "advisory_eyebrow": "खेत की जानकारी दें",
    "advisory_title": "अपने खेत के बारे में बताएं",
    "advisory_subtitle": "नीचे अपनी मिट्टी और मौसम की रीडिंग दर्ज करें। मॉडल इन सभी जानकारियों से सबसे अच्छी फ़सल सुझाएगा।",
    "advisory_location": "स्थान",
    "advisory_soil_type": "मिट्टी का प्रकार",
    "advisory_nutrients": "मिट्टी के पोषक तत्व (किग्रा/हेक्टेयर)",
    "advisory_climate": "मौसम की स्थिति",
    "advisory_submit": "विश्लेषण करें और सुझाव पाएं →",
    "advisory_fill_example": "उदाहरण मान भरें",

    "leaf_eyebrow": "एआई पत्ती स्कैन",
    "leaf_title": "पत्ती रोग पहचान",
    "leaf_subtitle": "एक पत्ती की स्पष्ट तस्वीर अपलोड करें। हमारा प्रशिक्षित मॉडल रोग की पहचान करता है (या स्वस्थ होने की पुष्टि करता है) और उपचार योजना देता है।",
    "leaf_upload_label": "पत्ती की तस्वीर",
    "leaf_detect_button": "रोग पहचानें →",

    "history_eyebrow": "आपके पिछले अनुरोध",
    "history_title": "सलाह इतिहास",
    "history_subtitle": "सभी सलाहें सहेजी जाती हैं ताकि आप बाद में उन्हें फिर से देख सकें।",

    "about_eyebrow": "तकनीकी जानकारी",
    "about_title": "मॉडलों के बारे में",

    "footer_tagline": "हर किसान के लिए एआई-आधारित फ़सल, उर्वरक और सिंचाई सलाह।",
    "footer_built_for": "शैक्षणिक प्रदर्शन के लिए निर्मित — एआई/एमएल प्रोजेक्ट",
    "language_label": "भाषा",
}

TRANSLATIONS = {"en": _EN, "bn": _BN, "hi": _HI}


class _FallbackDict(dict):
    """Missing keys silently fall back to English instead of raising/blank,
    so a partially-translated addition never breaks a page."""
    def __missing__(self, key):
        return _EN.get(key, key)


def get_translations(lang: str) -> _FallbackDict:
    base = TRANSLATIONS.get(lang, _EN)
    merged = _FallbackDict(_EN)
    merged.update(base)
    return merged
