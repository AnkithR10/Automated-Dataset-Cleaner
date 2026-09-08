import os
import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class XAIProcessor:
    """
    Service class to perform quick feature importance analysis and
    generate explainable AI insights from a cleaned dataset.
    """
    
    @staticmethod
    def analyze_cleaned_dataset(file_path: str) -> Dict[str, Any]:
        """
        Reads a cleaned CSV file, identifies target variables, trains a fast
        Random Forest model (or computes correlation if training fails),
        and returns explainable insights.
        """
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Cleaned dataset not found at: {file_path}")
            
            # Read dataset
            df = pd.read_csv(file_path)
            
            # If dataset is too small, return basic info
            if df.empty or len(df.columns) < 2:
                return {
                    "correlation_insight": "Dataset has insufficient features for analysis.",
                    "summary": "This dataset is empty or contains only a single column, preventing any multidimensional correlation or importance mapping.",
                    "important_features": [],
                    "analysis_type": "None",
                    "target_column": "None",
                    "num_rows": len(df),
                    "num_cols": len(df.columns)
                }
            
            # Clean column names (strip whitespace)
            df.columns = [col.strip() for col in df.columns]
            
            # Determine target column (assume last column by default)
            target_col = df.columns[-1]
            logger.info(f"Using target column candidate: '{target_col}'")
            
            # Try to identify other numeric and categorical columns
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            
            # Compute a simple correlation matrix for numeric columns
            top_correlations = []
            if len(numeric_cols) > 1:
                corr_matrix = df[numeric_cols].corr()
                if target_col in corr_matrix.columns:
                    target_corr = corr_matrix[target_col].abs().sort_values(ascending=False)
                    # Exclude the target column correlation with itself
                    for col, val in target_corr.items():
                        if col != target_col and not np.isnan(val):
                            top_correlations.append({
                                "feature": col,
                                "correlation": float(val),
                                "direction": "positive" if corr_matrix.loc[col, target_col] >= 0 else "negative"
                            })
            
            # Train a quick RandomForest to get feature importances
            important_features = []
            analysis_type = "Unsupervised/Clustering"
            
            # Prepare feature set (X) and target set (y)
            X = df.drop(columns=[target_col]).copy()
            y = df[target_col].copy()
            
            # Keep only numeric or categorical columns with moderate cardinality for model
            # Convert object columns to numeric codes
            for col in X.columns:
                if X[col].dtype == object or str(X[col].dtype) in ("category", "object"):
                    X[col] = X[col].astype(str).astype("category").cat.codes
                    
            # Fill remaining NaNs with column median or zero
            X = X.fillna(X.median(numeric_only=True).fillna(0))
            
            # If y is categorical/object, convert to numeric codes
            if y.dtype == object or str(y.dtype) in ("category", "object"):
                y = y.astype(str).astype("category").cat.codes
                analysis_type = "Classification"
            else:
                y = y.fillna(y.median())
                # If target has <= 10 unique values, we treat it as classification
                if y.nunique() <= 10:
                    analysis_type = "Classification"
                else:
                    analysis_type = "Regression"
                    
            # If we have at least 1 feature and 3 rows, we can train
            if len(X.columns) >= 1 and len(df) >= 3:
                try:
                    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
                    
                    if analysis_type == "Classification":
                        model = RandomForestClassifier(n_estimators=20, max_depth=5, random_state=42)
                    else:
                        model = RandomForestRegressor(n_estimators=20, max_depth=5, random_state=42)
                        
                    model.fit(X, y)
                    importances = model.feature_importances_
                    
                    for col, imp in zip(X.columns, importances):
                        important_features.append({
                            "feature": col,
                            "importance": float(imp)
                        })
                    
                    # Sort by importance descending
                    important_features.sort(key=lambda x: x["importance"], reverse=True)
                except Exception as ex:
                    logger.warning(f"Failed to fit random forest for XAI: {ex}")
                    # Fallback to correlation-based importance
                    for item in top_correlations:
                        important_features.append({
                            "feature": item["feature"],
                            "importance": item["correlation"]
                        })
                    # Normalize importances so they sum to 1.0 roughly
                    total = sum(x["importance"] for x in important_features)
                    if total > 0:
                        for x in important_features:
                            x["importance"] /= total
            
            # Construct explainable summaries
            if important_features:
                top_feat = important_features[0]["feature"]
                top_pct = int(important_features[0]["importance"] * 100)
                
                if len(important_features) > 1:
                    second_feat = important_features[1]["feature"]
                    second_pct = int(important_features[1]["importance"] * 100)
                    insight_msg = f"Feature '{top_feat}' (importance: {top_pct}%) and '{second_feat}' (importance: {second_pct}%) are the strongest predictors."
                    summary_msg = (
                        f"An AI feature analysis was performed on this dataset relative to the target variable '{target_col}'. "
                        f"The model detected that '{top_feat}' carries the highest predictive weight ({top_pct}%), followed closely by '{second_feat}' ({second_pct}%). "
                        f"This suggests that monitoring changes in these features will provide the highest clarity for predicting '{target_col}' outcomes."
                    )
                else:
                    insight_msg = f"Feature '{top_feat}' (importance: {top_pct}%) is the strongest predictor."
                    summary_msg = (
                        f"AI analysis relative to '{target_col}' indicates that '{top_feat}' is the primary feature of interest, "
                        f"accounting for {top_pct}% of the dataset's predictive signal. Other features have negligible impact."
                    )
            else:
                # If no features or no model fit succeeded, try using top correlations
                if top_correlations:
                    top_item = top_correlations[0]
                    insight_msg = f"Feature '{top_item['feature']}' has the highest absolute correlation of {top_item['correlation']:.2f}."
                    summary_msg = (
                        f"Linear correlation analysis suggests '{top_item['feature']}' has the strongest absolute correlation ({top_item['correlation']:.2f}) "
                        f"with target variable '{target_col}' in a {top_item['direction']} direction."
                    )
                else:
                    insight_msg = "No significant predictive features detected."
                    summary_msg = "AI analysis could not identify a strong correlation or predictive feature set. The dataset columns may be highly independent or have low variance."
                
            return {
                "correlation_insight": insight_msg,
                "summary": summary_msg,
                "important_features": important_features[:5], # Return top 5 features
                "analysis_type": analysis_type,
                "target_column": target_col,
                "num_rows": len(df),
                "num_cols": len(df.columns)
            }
            
        except Exception as e:
            logger.error(f"XAIProcessor failed: {e}")
            return {
                "correlation_insight": "AI Insight calculation bypassed due to processing error.",
                "summary": f"Could not perform XAI analysis: {str(e)}",
                "important_features": [],
                "analysis_type": "Error",
                "target_column": "None",
                "num_rows": 0,
                "num_cols": 0
            }
