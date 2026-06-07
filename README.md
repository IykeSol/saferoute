---
title: Road Accident Hotspot Predictor
emoji: 📍
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# Geospatial ML Road Accident Hotspot Predictor

A geospatial machine learning system that predicts high-risk accident areas using synthetic data with realistic noise patterns.

## Features
- Custom high-end **HTML/CSS/JS frontend** with a responsive layout.
- **Dark / Light Glassmorphism theme toggle**.
- Heatmap visualization using **Leaflet.js**.
- High-performance **FastAPI backend** running a trained ensemble ML model.
- Automatically handles geospatial bounds and generates probability hotspots.
- 100% prepared for **Hugging Face Docker Spaces**.

## Running Locally

1. Create a virtual environment and install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Generate synthetic data and train the model:
   ```bash
   python ml/train_model.py
   ```
3. Run the FastAPI application:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 7860 --reload
   ```
4. Open your browser and navigate to `http://localhost:7860`.

## Hugging Face Spaces Deployment

This repository is pre-configured to be deployed directly to a Hugging Face **Docker** space.
Simply create a new Space, select `Docker` as the Space SDK, and push this repository. The `Dockerfile` and `app_port` metadata are already configured to serve the app correctly on port 7860.