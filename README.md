<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:166534,100:84cc16&height=200&section=header&text=CropNexus&fontSize=64&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=AI-Powered%20Farmer%20Advisory&descSize=20&descAlignY=60" width="100%" alt="CropNexus banner" />

<!-- <img src="frontend/public/logo.png" width="110" alt="CropNexus logo" /> -->

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=20&pause=1000&color=16A34A&center=true&vCenter=true&width=640&lines=Crop+prediction+%7C+Leaf+disease+detection;Live+weather+%7C+Smart+irrigation+planning;Soil+health+%7C+Crop+calendar+%7C+Govt+schemes;Built+for+farmers.+Powered+by+AI." alt="Typing animation" />
</a>

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

</div>

---

## 📸 Screenshots

| | |
|---|---|
| **Landing** ![Landing](screenshots/landing.png) | **Feature section** ![Feature](screenshots/feature-section.png) |
| **Features menu** ![Menu](screenshots/features-menu.png) | **Sign-up (age-range guide)** ![Step 2](screenshots/signup-step2.png) |
| **Home (signed in)** ![Home](screenshots/home.png) | **Dark mode** ![Dark](screenshots/dark-mode.png) |
| **Crop Calendar** ![Calendar](screenshots/calendar.png) | **Products** ![Products](screenshots/products.png) |
| **Soil Health** ![Soil](screenshots/soil.png) | **Water Management** ![Water](screenshots/water.png) |
| **Plant Disease** ![Leaf](screenshots/leaf-disease.png) | **Mobile landing** ![Mobile](screenshots/mobile-landing.png) |
| **Mobile Features menu** ![Mobile menu](screenshots/mobile-menu.png) | **Mobile, signed in** ![Mobile signed in](screenshots/mobile-loggedin.png) |

---

## 📋 Table of Contents

[Overview](#-overview) · [Tech Stack](#-tech-stack) · [Features](#-features) · [Security](#-security) · [Model Results](#-model-results) · [Limitations](#-limitations)

---

## 🌾 Overview

CropNexus helps a farmer decide **what to grow**, check a **sick leaf**, view **weather**, plan **irrigation**, keep a **task calendar** and find **government schemes**, all in one app.

---

## 🧰 Tech Stack

<div align="center">

| Layer | Technologies |
|---|---|
| **Frontend** | ![React](https://skillicons.dev/icons?i=react,ts,vite,tailwind&theme=light) |
| **Backend** | ![Node](https://skillicons.dev/icons?i=nodejs,express,mongodb&theme=light) |
| **AI / ML** | ![ML](https://skillicons.dev/icons?i=python,fastapi,tensorflow,sklearn&theme=light) |

</div>
---

## ✨ Features

| Feature | Login | What it does | Powered by |
|---|:---:|---|---|
| 🌱 **Crop Prediction** | ✔ | Top-3 crops from N-P-K, pH and weather, with fertilizer and irrigation tips | Random Forest (30 crops) |
| 🍃 **Plant Disease Detector** | ✔ | Disease from a leaf photo, with symptoms, treatment and low-confidence warning | TensorFlow CNN (10 classes) |
| ☁️ **Live Weather** | – | Current conditions, 7-day forecast and farm alerts | Open-Meteo |
| 💧 **Water Management** | – | 7-day irrigation plan (14 crops, 6 soils, 3 methods), save days to calendar | FAO-56 + Open-Meteo |
| 📅 **Crop Calendar** | ✔ | Priority tasks, calendar and list views, filters, overdue alerts, edit and reschedule | MongoDB |
| 🪱 **Soil Health** | ✔ | Soil-test ratings (rule-based) and experimental soil-type photo guess | Rules + CNN |
| 🛒 **Products** | – | 30 hand-checked products with seller links, search and filters | `products.json` |
| 🏛️ **Farming Resources** | – | 18 government schemes with official links, plus agriculture news | `schemes.json` + RSS |
| 📬 **About / Contact** | – | Transparent model vs API vs rules table, spam-protected contact form | – |

**Also included:** 6-step sign-up, password reset by email, feedback with 1–5 stars, live community stats (landing and Home only), profile avatars, **9 languages**, light/dark theme, reduced-motion support, glass navbar, scroll reveals and count-up numbers.

---

## 🛡️ Security

- 🔑 Passwords hashed with **bcrypt (cost 12)**
- 🍪 **HttpOnly, SameSite=Strict** JWT cookie plus CSRF header
- 🚪 Logout and password reset instantly invalidate old sessions
- ⏱️ 3-minute login cooldown, 15-minute lock after 5 wrong passwords
- 🔗 Reset links: random, hashed, single-use, 15-minute expiry
- 🧱 `helmet`, zod validation, 12 MB upload limit, per-IP rate limits, contact honeypot

---

## 📊 Model Results

| Model | Data | Test accuracy |
|---|---|---|
| **Crop (real-data crops)** | Kaggle Crop Recommendation, 22 crops | **99.32 %** |
| **Crop (synthetic crops)** | 8 crops from author-written ranges | 100 % (by construction, not field data) |
| **Leaf disease** | PlantVillage, 10 classes | **91.96 %** |
| **Soil photo** | Phantom-fs, 7 soil types | 30.8 % (experimental) |

---

## ⚠️ Limitations

- 🧪 8 crops use **synthetic data** and need agronomist review before real use.
- 🪱 Soil photo model is **weak** (30.8 %) and the dataset is non-commercial; it never reads nutrients, pH or salinity from a photo.
- 🍃 Leaf model covers 5 crops from lab-style photos; field photos will score lower.
- 🪪 No OTP or identity verification at sign-up.
- 🌐 New feature pages are English-only; other languages fall back to English there.
- 🌦️ Water plans and weather alerts are estimates, not sensor measurements.

> CropNexus is a decision-support tool. Confirm important decisions with a local agriculture officer.

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:84cc16,100:166534&height=120&section=footer&text=CropNexus%20%C2%A9%202026&fontSize=22&fontColor=ffffff&animation=fadeIn&fontAlignY=65" width="100%" alt="footer" />

</div>
