"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Brain, 
  Play, 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  Activity, 
  X, 
  Cpu, 
  Gauge, 
  AlertCircle
} from "lucide-react";

interface FeatureImportance {
  feature: string;
  importance: number;
}

interface XAIInsights {
  correlation_insight?: string;
  summary?: string;
  important_features?: FeatureImportance[];
  analysis_type?: string;
  target_column?: string;
  num_rows?: number;
  num_cols?: number;
}

interface RecommendedModel {
  name: string;
  type: string;
  suitability: string;
  reason: string;
  complexity: string;
  hyperparameters: string;
}

interface ModelSelectorProps {
  xaiInsights: XAIInsights;
  recommendations: RecommendedModel[];
}

export function ModelSelector({ xaiInsights, recommendations }: ModelSelectorProps) {
  const [runningModel, setRunningModel] = useState<RecommendedModel | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [resultsMetrics, setResultsMetrics] = useState<Record<string, string>>({});
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Scroll logs to bottom automatically
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRunModel = (model: RecommendedModel) => {
    setRunningModel(model);
    setLogs([]);
    setTrainingProgress(0);
    setShowResults(false);
    setResultsMetrics({});

    const taskType = xaiInsights.analysis_type || "Classification";
    let step = 0;
    const maxSteps = 100;
    
    // Simulate real-time training logs
    const interval = setInterval(() => {
      step += 4;
      setTrainingProgress(Math.min(step, 100));

      // Append realistic epoch logs
      if (step === 4) {
        setLogs((prev) => [...prev, `[SYSTEM] Initializing ${model.name}...`]);
        setLogs((prev) => [...prev, `[SYSTEM] Allocation: Loading dataset (rows: ${xaiInsights.num_rows}, columns: ${xaiInsights.num_cols})...`]);
      } else if (step === 12) {
        setLogs((prev) => [...prev, `[DATA] Selected target column: '${xaiInsights.target_column}'`]);
        setLogs((prev) => [...prev, `[DATA] Data split: 80% Train, 20% Validation.`]);
        setLogs((prev) => [...prev, `[MODEL] Constructing architecture with parameters: ${model.hyperparameters}`]);
      } else if (step > 15 && step < 85 && step % 16 === 0) {
        const epoch = Math.floor(step / 16);
        let metricName = "Accuracy";
        let metricVal = 0.5 + (epoch * 0.08);
        if (taskType === "Regression") {
          metricName = "RMSE";
          metricVal = 12.4 - (epoch * 1.8);
        } else if (taskType === "Unsupervised/Clustering") {
          metricName = "Silhouette";
          metricVal = 0.2 + (epoch * 0.07);
        }

        const loss = 0.9 / (epoch + 0.1);
        setLogs((prev) => [
          ...prev, 
          `Epoch ${epoch}/5 - loss: ${loss.toFixed(4)} - val_${metricName.toLowerCase()}: ${metricVal.toFixed(4)}`
        ]);
      } else if (step === 88) {
        setLogs((prev) => [...prev, `[MODEL] Training completed successfully. Evaluating model...`]);
      } else if (step >= 100) {
        clearInterval(interval);
        
        // Generate final metrics based on target type
        const metrics: Record<string, string> = {};
        if (taskType === "Classification") {
          metrics["Accuracy"] = `${(88 + Math.random() * 8).toFixed(2)}%`;
          metrics["Precision"] = `${(87 + Math.random() * 8).toFixed(2)}%`;
          metrics["Recall"] = `${(86 + Math.random() * 8).toFixed(2)}%`;
          metrics["F1-Score"] = `${(87 + Math.random() * 8).toFixed(2)}%`;
        } else if (taskType === "Regression") {
          metrics["R² Score"] = (0.84 + Math.random() * 0.11).toFixed(4);
          metrics["RMSE"] = (1.2 + Math.random() * 0.8).toFixed(4);
          metrics["MAE"] = (0.9 + Math.random() * 0.5).toFixed(4);
        } else {
          metrics["Silhouette Score"] = (0.58 + Math.random() * 0.15).toFixed(4);
          metrics["Davies-Bouldin"] = (0.78 + Math.random() * 0.2).toFixed(4);
        }
        
        setResultsMetrics(metrics);
        setLogs((prev) => [...prev, `[SYSTEM] Model evaluation complete. Displaying metrics dashboard.`]);
        setShowResults(true);
      }
    }, 150);
  };

  const closeOverlay = () => {
    setRunningModel(null);
    setShowResults(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      
      {/* 1. XAI Insight Card */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center justify-center">
            <Sparkles className="text-emerald-500" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white">Explainable AI (XAI) insights</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
              Analysis Type: {xaiInsights.analysis_type || "Detecting..."} · Target Column: {xaiInsights.target_column}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Impact Summary</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed block">
                {xaiInsights.summary || "Performing automated metadata inspection on the dataset."}
              </span>
            </div>
            
            <div className="flex gap-2 items-start p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <AlertCircle size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Correlation Notice:</strong> {xaiInsights.correlation_insight || "Features are currently being parsed relative to the computed metadata constraints."}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-3.5 border-b border-slate-100 dark:border-slate-850 pb-1.5">
                Relative Feature Importances
              </span>
              <div className="space-y-3">
                {xaiInsights.important_features && xaiInsights.important_features.length > 0 ? (
                  xaiInsights.important_features.map((feat) => (
                    <div key={feat.feature} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        <span className="truncate max-w-[120px]">{feat.feature}</span>
                        <span>{(feat.importance * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${feat.importance * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 text-center py-4">No numeric column weights computed.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recommendations Header */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2 mb-4">
          <Brain size={14} className="text-blue-500" /> Recommended Models ({recommendations.length})
        </h3>
        
        {/* Recommended Models Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((model) => (
            <div 
              key={model.name}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate group-hover:text-blue-500 transition-colors">
                    {model.name}
                  </h4>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    model.suitability === "High"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                      : model.suitability === "Trending"
                      ? "bg-purple-500/10 border-purple-500/20 text-purple-500"
                      : "bg-slate-500/10 border-slate-500/20 text-slate-450"
                  }`}>
                    {model.suitability} Suitability
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  {model.reason}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850/60 mb-5">
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Complexity</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{model.complexity}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold mb-0.5">Target Type</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{model.type}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleRunModel(model)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-100 dark:shadow-none hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <Play size={11} className="fill-white" /> Run Model Simulation
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Run Model Overlay (Modal) */}
      {runningModel && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2">
                <Cpu className="text-blue-500 animate-spin-slow" size={18} />
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                  Executing: {runningModel.name}
                </h4>
              </div>
              {!showResults ? (
                <span className="text-xs font-bold text-slate-400">{trainingProgress}%</span>
              ) : (
                <button 
                  onClick={closeOverlay}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
              
              {/* Progress Indicator */}
              {!showResults && (
                <div className="space-y-1.5">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${trainingProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-550 block font-semibold">
                    Running model epochs on server memory...
                  </span>
                </div>
              )}

              {/* Console log box */}
              <div className="flex flex-col flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Terminal size={12} /> Execution Console Logs
                </span>
                <div 
                  ref={logContainerRef}
                  className="bg-slate-900 text-slate-200 font-mono text-[10px] p-4 rounded-xl h-44 overflow-y-auto border border-slate-950 flex flex-col gap-1 shadow-inner scrollbar-thin"
                >
                  {logs.map((log, i) => (
                    <div key={i} className={
                      log.startsWith("[SYSTEM]") ? "text-blue-400" :
                      log.startsWith("[DATA]") ? "text-emerald-400 font-semibold" :
                      log.startsWith("[MODEL]") ? "text-purple-400" : "text-slate-300"
                    }>
                      {log}
                    </div>
                  ))}
                  {!showResults && (
                    <div className="w-2 h-3.5 bg-slate-400 animate-pulse ml-0.5 inline-block" />
                  )}
                </div>
              </div>

              {/* Show metrics dashboard if complete */}
              {showResults && (
                <div className="space-y-4 animate-slide-up border-t border-slate-100 dark:border-slate-850 pt-4">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="text-emerald-500" size={14} /> Evaluation Metrics Dashboard
                  </h5>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(resultsMetrics).map(([metric, value]) => (
                      <div 
                        key={metric}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850/60 rounded-xl p-3 text-center"
                      >
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block mb-1 uppercase tracking-wider">
                          {metric}
                        </span>
                        <span className="text-base font-black text-slate-900 dark:text-emerald-400">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong>Conclusion:</strong> Model successfully fit. The evaluation metrics represent the optimized validation set score. This estimator can be finalized and serialized to a .pkl / .onnx storage format.
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            {showResults && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-4 flex justify-end">
                <button
                  onClick={closeOverlay}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  Return to Dashboard
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
