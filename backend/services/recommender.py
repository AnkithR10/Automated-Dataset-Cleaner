import logging
import httpx
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class ModelRecommender:
    """
    Service class to recommend machine learning models based on dataset metadata
    and fetch SOTA trends from public APIs to keep recommendations future-proof.
    """
    
    @staticmethod
    def recommend(num_rows: int, num_cols: int, analysis_type: str) -> List[Dict[str, Any]]:
        """
        Suggests appropriate models based on row/col bounds and target analysis type.
        """
        recommendations = []
        
        if analysis_type == "Classification":
            # 1. Random Forest
            recommendations.append({
                "name": "RandomForestClassifier",
                "type": "Classification",
                "suitability": "High" if num_rows < 50000 else "Medium",
                "reason": "Excellent baseline model for tabular data. Handles non-linear relations and requires minimal tuning.",
                "complexity": "Medium",
                "hyperparameters": "n_estimators=100, max_depth=None, min_samples_split=2"
            })
            
            # 2. XGBoost
            recommendations.append({
                "name": "XGBClassifier",
                "type": "Classification",
                "suitability": "High",
                "reason": "State-of-the-art gradient boosting framework. Dominates tabular data competitions with superior speed and regularization.",
                "complexity": "High",
                "hyperparameters": "n_estimators=100, learning_rate=0.1, max_depth=6"
            })
            
            # 3. LightGBM
            if num_rows > 1000:
                recommendations.append({
                    "name": "LGBMClassifier",
                    "type": "Classification",
                    "suitability": "High" if num_rows > 10000 else "Medium",
                    "reason": "Highly efficient gradient boosting. Extremely fast training speed, low memory usage, and great handling of large scale datasets.",
                    "complexity": "High",
                    "hyperparameters": "num_leaves=31, learning_rate=0.05, n_estimators=100"
                })
                
            # 4. CatBoost
            recommendations.append({
                "name": "CatBoostClassifier",
                "type": "Classification",
                "suitability": "High",
                "reason": "Specially optimized for categorical features without requiring manual pre-processing like one-hot encoding.",
                "complexity": "High",
                "hyperparameters": "iterations=500, learning_rate=0.03, depth=6"
            })
            
            # 5. Support Vector Machines (SVM)
            if num_rows < 10000:
                recommendations.append({
                    "name": "SVC",
                    "type": "Classification",
                    "suitability": "Medium",
                    "reason": "Effective in high-dimensional spaces. Best for smaller, clean datasets since training time scales quadratically.",
                    "complexity": "Medium",
                    "hyperparameters": "kernel='rbf', C=1.0, gamma='scale'"
                })
                
            # 6. Deep Neural Network
            if num_rows > 5000:
                recommendations.append({
                    "name": "MultiLayerPerceptron (MLP)",
                    "type": "Classification",
                    "suitability": "Medium",
                    "reason": "Neural network architecture. Good for large tabular datasets with complex representation needs, but prone to overfitting.",
                    "complexity": "Very High",
                    "hyperparameters": "hidden_layer_sizes=(100, 50), activation='relu', solver='adam'"
                })
                
        elif analysis_type == "Regression":
            # 1. Linear Regression
            recommendations.append({
                "name": "LinearRegression",
                "type": "Regression",
                "suitability": "High" if num_cols < num_rows else "Low",
                "reason": "Simple baseline model. Easy to interpret and serves as a benchmark for more complex algorithms.",
                "complexity": "Low",
                "hyperparameters": "fit_intercept=True"
            })
            
            # 2. Random Forest Regressor
            recommendations.append({
                "name": "RandomForestRegressor",
                "type": "Regression",
                "suitability": "High",
                "reason": "Robust ensemble algorithm. Resistant to overfitting and computes non-linear relationships without scaling features.",
                "complexity": "Medium",
                "hyperparameters": "n_estimators=100, max_depth=None"
            })
            
            # 3. Gradient Boosting Regressor
            recommendations.append({
                "name": "GradientBoostingRegressor",
                "type": "Regression",
                "suitability": "High",
                "reason": "Sequential ensemble model. Optimizes loss functions iteratively, achieving high precision on continuous targets.",
                "complexity": "High",
                "hyperparameters": "n_estimators=100, learning_rate=0.1, max_depth=3"
            })
            
            # 4. XGBoost Regressor
            recommendations.append({
                "name": "XGBRegressor",
                "type": "Regression",
                "suitability": "High",
                "reason": "State-of-the-art gradient boosting for regression. Superior regularization features prevent overfitting.",
                "complexity": "High",
                "hyperparameters": "n_estimators=100, learning_rate=0.1, max_depth=6"
            })
            
        else: # Unsupervised/Clustering
            # 1. K-Means
            recommendations.append({
                "name": "KMeans",
                "type": "Clustering",
                "suitability": "High",
                "reason": "Most popular clustering algorithm. Groups data into K clusters based on Euclidean distance. Highly scalable.",
                "complexity": "Low",
                "hyperparameters": "n_clusters=8, init='k-means++', n_init=10"
            })
            
            # 2. DBSCAN
            recommendations.append({
                "name": "DBSCAN",
                "type": "Clustering",
                "suitability": "Medium" if num_rows < 20000 else "Low",
                "reason": "Density-based spatial clustering. Finds arbitrary shapes and naturally handles outliers/noise.",
                "complexity": "Medium",
                "hyperparameters": "eps=0.5, min_samples=5"
            })
            
            # 3. Agglomerative Clustering
            if num_rows < 5000:
                recommendations.append({
                    "name": "AgglomerativeClustering",
                    "type": "Clustering",
                    "suitability": "Medium",
                    "reason": "Hierarchical clustering. Creates tree-like structures. Good for visual representation, but has high memory overhead.",
                    "complexity": "High",
                    "hyperparameters": "n_clusters=2, linkage='ward'"
                })

        # Future-proofing check to add a live trending SOTA model
        sota_models = ModelRecommender.fetch_latest_sota_models(analysis_type)
        if sota_models:
            recommendations.extend(sota_models)
            
        return recommendations[:10] # Suggest between 1 to 10 models

    @staticmethod
    def fetch_latest_sota_models(analysis_type: str) -> List[Dict[str, Any]]:
        """
        Fetches the latest trending models from HuggingFace/scikit-learn
        to keep the recommender future-proof.
        """
        try:
            # We will query Hugging Face API for top downloaded tabular classification models
            # This fetches live data dynamically from the web!
            tags = "tabular-classification" if analysis_type == "Classification" else "tabular-regression"
            url = f"https://huggingface.co/api/models?filter={tags}&sort=downloads&direction=-1&limit=2"
            
            # Use a short timeout so we do not block if the user is offline or HF is down
            resp = httpx.get(url, timeout=3.0)
            if resp.status_code == 200:
                hf_data = resp.json()
                sota = []
                for model in hf_data:
                    model_id = model.get("modelId", "")
                    downloads = model.get("downloads", 0)
                    if model_id:
                        sota.append({
                            "name": f"HuggingFace SOTA: {model_id.split('/')[-1]}",
                            "type": analysis_type,
                            "suitability": "Trending",
                            "reason": f"Hugging Face hub trending model with {downloads:,} downloads. Highly suited for complex state-of-the-art transformer representation.",
                            "complexity": "Very High",
                            "hyperparameters": f"repo='{model_id}'"
                        })
                return sota
        except Exception as e:
            logger.warning(f"Failed to fetch Hugging Face SOTA models: {e}")
            
        # Fallback to local modern recommendations
        return [{
            "name": "SOTA TabNet / TabTransformer",
            "type": analysis_type,
            "suitability": "Trending",
            "reason": "Deep learning models custom designed for tabular data, incorporating attention mechanisms to model feature interactions.",
            "complexity": "Very High",
            "hyperparameters": "n_d=8, n_a=8, n_steps=3, gamma=1.3"
        }]
