# Production-Ready SaaS Boilerplate

A modular, production-ready SaaS template built with a Next.js frontend, a FastAPI backend, Firebase Auth, and Razorpay Payments integration.

## Project Structure

```text
├── frontend/             # Next.js 15+ Frontend (TypeScript, App Router, Vanilla CSS)
│   ├── src/
│   │   ├── app/          # App routing and layout
│   │   ├── context/      # React contexts (Firebase Auth)
│   │   ├── hooks/        # Custom React hooks (useAuth)
│   │   └── lib/          # Utilities and client initializers
│   └── package.json
│
├── backend/              # FastAPI Backend
│   ├── routes/           # Router groups (auth, payments, health)
│   ├── services/         # Third-party integrations (Razorpay, Firebase Admin)
│   ├── main.py           # FastAPI server startup & middleware
│   └── requirements.txt
│
├── deployment/           # Production container orchestration
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   └── docker-compose.yml
│
├── .env.example          # Environment variable template
└── README.md             # Documentation
```

---

## Prerequisites

- **Node.js** >= 18.0.0
- **Python** >= 3.10
- **Docker** & **Docker Compose** (for containerized setup)

---

## Local Setup

### 1. Environment Configuration

Copy the example environment file and fill in your keys:

```bash
cp .env.example .env
```

To run individual parts locally, you may want to copy appropriate portions into local environment configs (e.g. `frontend/.env.local` or `backend/.env`).

### 2. Frontend Setup (Next.js)

Navigate to the frontend folder, install dependencies, and run the development server:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on [http://localhost:3000](http://localhost:3000).

### 3. Backend Setup (FastAPI)

Navigate to the backend folder, create a virtual environment, install dependencies, and run the FastAPI server:

```bash
cd backend
python -m venv venv
# On Windows (CMD/PowerShell)
.\venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend server will start on [http://localhost:8000](http://localhost:8000).
- API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- API Redoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## Integration Overview

### Auth (Firebase)
User authentication is managed via Firebase Client SDK in the frontend. It is supported by:
- `useAuth` hook tracking token updates, user profiles, and session state.
- Firebase Auth context provider tracking current user persistence.
- A FastAPI backend validation route checking JWT header tokens using the Firebase Admin SDK.

### Payments (Razorpay)
Standard Indian payment gateway workflow implemented:
1. User clicks "Subscribe" on the Next.js pricing page.
2. Next.js calls backend POST `/api/v1/payments/create-order` with the price details.
3. FastAPI calls Razorpay SDK to create an order and returns `order_id`, `amount`, `currency` to Next.js.
4. Next.js launches the Razorpay Checkout modal dynamically in-browser.
5. Upon successful checkout, Razorpay returns transaction signatures, which Next.js sends to POST `/api/v1/payments/verify-payment`.
6. FastAPI cryptographically verifies the payment signature to confirm payment completion securely.

---

## Containerized Deployment (Docker)

To orchestrate and run both services locally in Docker:

```bash
docker-compose -f deployment/docker-compose.yml up --build
```

---

## Production Deployment Path

### Frontend (Vercel)

Next.js is native to Vercel, making it the most optimal deployment route:
1. Connect your GitHub repository to Vercel.
2. Select the `frontend` subdirectory as the root directory.
3. Override environment variables in the Vercel Dashboard corresponding to the frontend keys in `.env.example`.
4. Deploy. Vercel will automatically configure CDN, static paths, and Edge functions.

### Backend (Render)

Deploying the FastAPI Dockerized backend on Render:
1. Push your code to GitHub.
2. Log into Render and create a new **Web Service**.
3. Point to your repository and set the path/build settings:
   - Build Filter: specify Dockerfile path `./deployment/Dockerfile.backend`
   - Alternatively, deploy as a native Python service:
     - Build Command: `pip install -r backend/requirements.txt`
     - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables in Render's dashboard corresponding to the backend keys in `.env.example`.
5. Deploy. Render will provision an HTTPS endpoint with automatic SSL certificates.
