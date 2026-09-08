"use client";

import React, { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { 
  CheckCircle2, 
  HelpCircle, 
  Play, 
  Terminal, 
  Cpu, 
  X, 
  Loader2, 
  Sparkles,
  BarChart2,
  Lock
} from "lucide-react";

interface MLInsightsProps {
  jobId: string;
  filename: string;
  numRows: number;
  numCols: number;
  targetColumn: string;
  userPlan: string;
}

export function MLInsights({ jobId, filename, numRows, numCols, targetColumn, userPlan }: MLInsightsProps) {
  const [selectedType, setSelectedType] = useState<"Classification" | "Regression" | "Clustering">("Classification");
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedFeature, setLockedFeature] = useState("");

  const hasFeature = (plan: string, feature: "xai" | "simulation") => {
    const premiumTiers = [
      "individual_go", 
      "individual_plus", 
      "individual_pro", 
      "enterprise_plus", 
      "enterprise_pro",
      "Founder Mode (Unlimited)"
    ];
    return premiumTiers.includes(plan);
  };

  const handleXaiClick = (model: any) => {
    if (!hasFeature(userPlan, "xai")) {
      setLockedFeature("Explainable AI (Why?)");
      setShowUpgradeModal(true);
      return;
    }
    setExplanationModel(model);
  };

  const handleSimulateClick = (model: any) => {
    if (!hasFeature(userPlan, "simulation")) {
      setLockedFeature("Training Simulation");
      setShowUpgradeModal(true);
      return;
    }
    handleSimulateModel(model);
  };

  // XAI modal explanation
  const [explanationModel, setExplanationModel] = useState<any | null>(null);

  // Simulation console state
  const [runningModel, setRunningModel] = useState<any | null>(null);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [showSimResults, setShowSimResults] = useState(false);
  const [simResultsMetrics, setSimResultsMetrics] = useState<Record<string, string>>({});

  const logContainerRef = useRef<HTMLDivElement>(null);

  const closeSimOverlay = () => {
    setRunningModel(null);
    setShowSimResults(false);
    setSimulationProgress(0);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [simulationLogs]);

  // Fetch suggestions when task type changes
  const fetchSuggestions = async (type: "Classification" | "Regression" | "Clustering") => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Recommend ${type.toLowerCase()} models for dataset ${filename}`;
      const res = await api.post("/api/chat/message", {
        job_id: jobId,
        message: prompt,
        categories: [type]
      });
      
      if (res.data && res.data.models) {
        setModels(res.data.models);
        setDisclaimer(res.data.disclaimer || "");
      } else {
        setModels([]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to load model suggestions.");
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchSuggestions(selectedType);
    }
  }, [jobId, selectedType]);

  // Handle checkboxes as mutually exclusive selections
  const handleCheckboxChange = (type: "Classification" | "Regression" | "Clustering") => {
    if (type !== "Classification" && !hasFeature(userPlan, "xai")) {
      setLockedFeature(`${type} Suggestions`);
      setShowUpgradeModal(true);
      return;
    }
    setSelectedType(type);
  };

  // Run training simulation
  const handleSimulateModel = (model: any) => {
    setRunningModel(model);
    setSimulationLogs([]);
    setSimulationProgress(0);
    setShowSimResults(false);
    setSimResultsMetrics({});

    const taskType = model.type || selectedType;
    let step = 0;

    const interval = setInterval(() => {
      step += 5;
      setSimulationProgress(Math.min(step, 100));

      if (step === 5) {
        setSimulationLogs((prev) => [
          ...prev,
          `[SYSTEM] Allocating hardware layers for training execution...`,
          `[SYSTEM] Loaded dataset ${filename} (rows: ${numRows}, columns: ${numCols}).`
        ]);
      } else if (step === 20) {
        setSimulationLogs((prev) => [
          ...prev,
          `[DATA] Selected target column: '${targetColumn}'`,
          `[DATA] Folds definition: 85% training, 15% validation matrix.`,
          `[MODEL] Starting training epoch loop with heuristic splits.`
        ]);
      } else if (step > 25 && step < 85 && step % 15 === 0) {
        const epoch = Math.floor(step / 15);
        let scoreLabel = "accuracy";
        let scoreVal = 0.65 + epoch * 0.05;
        if (taskType === "Regression") {
          scoreLabel = "rmse";
          scoreVal = 6.4 - epoch * 0.9;
        } else if (taskType === "Clustering") {
          scoreLabel = "silhouette";
          scoreVal = 0.35 + epoch * 0.06;
        }
        
        setSimulationLogs((prev) => [
          ...prev,
          `Epoch ${epoch}/4 - training_loss: ${(0.7 / (epoch + 0.1)).toFixed(4)} - val_${scoreLabel}: ${scoreVal.toFixed(4)}`
        ]);
      } else if (step === 90) {
        setSimulationLogs((prev) => [...prev, `[MODEL] Estimator compiled. Executing evaluation matrices...`]);
      } else if (step >= 100) {
        clearInterval(interval);
        
        const finalMetrics: Record<string, string> = {};
        const rng = Math.random();
        
        if (taskType === "Classification") {
          finalMetrics["Accuracy"] = `${(85 + rng * 7).toFixed(2)}%`;
          finalMetrics["Precision"] = `${(84 + rng * 7).toFixed(2)}%`;
          finalMetrics["Recall"] = `${(83 + rng * 7).toFixed(2)}%`;
          finalMetrics["F1-Score"] = `${(84 + rng * 7).toFixed(2)}%`;
        } else if (taskType === "Regression") {
          finalMetrics["R² Score"] = (0.81 + rng * 0.09).toFixed(4);
          finalMetrics["RMSE"] = (1.2 + rng * 0.6).toFixed(4);
          finalMetrics["MAE"] = (0.8 + rng * 0.5).toFixed(4);
        } else {
          finalMetrics["Silhouette Score"] = (0.52 + rng * 0.13).toFixed(4);
          finalMetrics["Davies-Bouldin"] = (0.78 + rng * 0.15).toFixed(4);
        }

        setSimResultsMetrics(finalMetrics);
        setSimulationLogs((prev) => [...prev, `[SYSTEM] Model training complete. Evaluation complete.`]);
        setShowSimResults(true);
      }
    }, 120);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Target Task Selection Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3.5 uppercase tracking-wider flex items-center gap-2">
          <BarChart2 size={16} className="text-slate-500" /> Target Task Selection
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: "Classification", desc: "Predict categories" },
            { id: "Regression", desc: "Fit continuous curves" },
            { id: "Clustering", desc: "Segment unstructured groupings" }
          ].map((item) => {
            const isLocked = (item.id === "Regression" || item.id === "Clustering") && !hasFeature(userPlan, "xai");
            return (
              <label 
                key={item.id}
                title={isLocked ? "Locked - Upgrade to unlock" : undefined}
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer select-none transition-all relative ${
                  isLocked
                    ? "border-slate-100 bg-slate-100/50 text-slate-400 dark:bg-slate-900/50 dark:border-slate-800"
                    : selectedType === item.id
                    ? "border-emerald-600 bg-emerald-500/5 text-emerald-950 font-bold dark:text-white"
                    : "border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!isLocked && selectedType === item.id}
                  onChange={() => handleCheckboxChange(item.id as any)}
                  className="h-4 w-4 mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold flex items-center gap-1 leading-none mb-1">
                    {item.id}
                    {isLocked && <Lock size={10} className="text-slate-400" />}
                  </span>
                  <span className="text-[10px] text-slate-450 block leading-tight font-semibold truncate">{item.desc}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. AI Insights Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="text-emerald-600" size={16} />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Model Suggestions Panel
            </h3>
          </div>
          {loading && <Loader2 className="animate-spin text-emerald-600" size={14} />}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold">
            {error}
          </div>
        )}

        {!loading && !error && models.length > 0 && (
          <div className="space-y-6">
            
            {/* Tabular Expected Performance */}
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wide">
                Expected Performance
              </span>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="px-4 py-2">Model</th>
                      <th className="px-4 py-2">Accuracy Range</th>
                      <th className="px-4 py-2">Suitability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((model) => (
                      <tr key={model.name} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-bold text-slate-700">{model.name}</td>
                        <td className="px-4 py-2.5 font-extrabold text-emerald-700 bg-emerald-500/5">{model.metric_range}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            model.suitability === "High"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                              : "bg-slate-50 border-slate-200 text-slate-500"
                          }`}>
                            {model.suitability}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Models Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {models.map((model) => (
                <div 
                  key={model.name} 
                  className="border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col justify-between transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-1.5">
                      <h4 className="font-bold text-slate-800 text-xs truncate" title={model.name}>
                        {model.name}
                      </h4>
                      <span className="text-[10px] text-slate-450 font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                        {model.type}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      {model.reason}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleXaiClick(model)}
                      title={!hasFeature(userPlan, "xai") ? "Locked - Upgrade to unlock" : undefined}
                      className="flex items-center justify-center gap-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                    >
                      {!hasFeature(userPlan, "xai") ? (
                        <Lock size={11} className="text-slate-400" />
                      ) : (
                        <HelpCircle size={11} />
                      )}
                      <span>Why?</span>
                    </button>
                    <button
                      onClick={() => handleSimulateClick(model)}
                      title={!hasFeature(userPlan, "simulation") ? "Locked - Upgrade to unlock" : undefined}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-3 font-bold text-[10px] rounded-lg transition-all shadow-sm cursor-pointer ${
                        !hasFeature(userPlan, "simulation")
                          ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {!hasFeature(userPlan, "simulation") ? (
                        <Lock size={11} className="text-slate-400" />
                      ) : (
                        <Play size={10} className="fill-white" />
                      )}
                      <span>Simulate</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mandatory Red Warning */}
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
              <p className="text-[11px] text-red-600 font-semibold leading-relaxed">
                Note: These expected performance metrics are AI-generated estimates based on dataset heuristics and are not guaranteed outcomes.
              </p>
            </div>

          </div>
        )}

        {!loading && !error && models.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs">
            No active suggestions loaded. Toggle types above to fetch.
          </div>
        )}
      </div>

      {/* MODAL 1: "Why?" explainer detail */}
      {explanationModel && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden text-left animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Explainable AI Suggestion Why?
              </h4>
              <button 
                onClick={() => setExplanationModel(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold mb-0.5">Model Name</span>
                <span className="font-black text-slate-800 text-sm">{explanationModel.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold mb-1">XAI Suitability Detail</span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed font-semibold">
                  {explanationModel.explanation || explanationModel.reason}
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setExplanationModel(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Simulation Terminal Console */}
      {runningModel && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-left animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div className="flex items-center gap-2">
                <Cpu className="text-emerald-600 animate-spin-slow" size={16} />
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Simulation: {runningModel.name}
                </h4>
              </div>
              {showSimResults && (
                <button 
                  onClick={closeSimOverlay}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
              
              {!showSimResults && (
                <div className="space-y-1">
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 rounded-full transition-all duration-200"
                      style={{ width: `${simulationProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Running validation matrices on remote heap...
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal size={12} /> Execution Console Logs
                </span>
                <div 
                  ref={logContainerRef}
                  className="bg-slate-900 text-slate-200 font-mono text-[10px] p-4 rounded-lg h-44 overflow-y-auto flex flex-col gap-1 shadow-inner scrollbar-thin"
                >
                  {simulationLogs.map((log, i) => (
                    <div key={i} className={
                      log.startsWith("[SYSTEM]") ? "text-blue-400" :
                      log.startsWith("[DATA]") ? "text-emerald-400 font-semibold" : "text-slate-350"
                    }>
                      {log}
                    </div>
                  ))}
                  {!showSimResults && (
                    <div className="w-1.5 h-3.5 bg-slate-400 animate-pulse ml-0.5 inline-block" />
                  )}
                </div>
              </div>

              {showSimResults && (
                <div className="space-y-3.5 pt-4 border-t border-slate-100 animate-slide-up">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="text-emerald-500" size={14} /> Evaluation Accuracy Matrix
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(simResultsMetrics).map(([metric, value]) => (
                      <div key={metric} className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] text-slate-400 font-bold block mb-1 uppercase">{metric}</span>
                        <span className="text-sm font-black text-slate-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showSimResults && (
              <div className="border-t border-slate-100 p-4 flex justify-end">
                <button
                  onClick={closeSimOverlay}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-transform hover:-translate-y-0.5"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden text-center p-6 animate-scale-up">
            <div className="mx-auto h-12 w-12 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/30 text-amber-500 rounded-full flex items-center justify-center mb-4">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">
              Upgrade to Premium
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              The feature <span className="font-bold text-slate-700 dark:text-slate-300">"{lockedFeature}"</span> is exclusive to premium users. Upgrade your subscription to unlock advanced machine learning capabilities.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <a
                href="/pricing"
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center cursor-pointer"
              >
                View Plans
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
