import os
import pandas as pd
import numpy as np
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class DatasetCleaner:
    """
    Service class responsible for loading, cleaning, and exporting CSV datasets.
    Supported strategies:
    - missing_values: "drop", "mean", "median", "mode", "none"
    - remove_duplicates: bool
    - standardize_types: bool (trims whitespace, converts common columns)
    - standardize_column_names: bool (cleans headers to lowercase snake_case)
    """
    
    @staticmethod
    def clean_data(file_path: str, strategies: Dict[str, Any]) -> str:
        """
        Cleans the CSV dataset based on selected strategies.
        Saves the resulting file as a processed CSV and returns the processed file path.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Source file not found at: {file_path}")
            
        logger.info(f"Starting data cleaning for {file_path} with strategies: {strategies}")
        
        # Load dataset
        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            logger.error(f"Error loading CSV file: {str(e)}")
            raise ValueError(f"Failed to read CSV file: {str(e)}")
            
        # 1. Handle Duplicates
        if strategies.get("remove_duplicates", False):
            initial_rows = len(df)
            df.drop_duplicates(inplace=True)
            duplicates_removed = initial_rows - len(df)
            logger.info(f"Removed {duplicates_removed} duplicate rows.")

        # 2. Handle Column Names Standardization
        if strategies.get("standardize_column_names", False):
            import re
            new_columns = []
            for col in df.columns:
                cleaned = str(col).strip().lower()
                cleaned = re.sub(r'[^\w\s-]', '', cleaned)
                cleaned = re.sub(r'[-\s]+', '_', cleaned)
                cleaned = re.sub(r'^_+|_+$', '', cleaned)
                new_columns.append(cleaned if cleaned else f"col_{len(new_columns)}")
            df.columns = new_columns
            logger.info("Column headers standardized to snake_case.")

        # 3. Handle Data Consistency (Trim Whitespaces & Standardize Types)
        if strategies.get("standardize_types", False):
            # Trim whitespaces in all string columns
            for col in df.select_dtypes(include=['object', 'string']).columns:
                try:
                    df[col] = df[col].astype(str).str.strip()
                except Exception as e:
                    logger.warning(f"Failed to strip whitespace in column {col}: {str(e)}")
            
            # Standardize common column types
            # convert_dtypes() attempts to convert columns to optimal types supporting pd.NA
            df = df.convert_dtypes()
            logger.info("Data consistency: Whitespaces trimmed and types standardized.")

        # 4. Handle Missing Values
        missing_strategy = strategies.get("missing_values", "none")
        if missing_strategy != "none" and df.isnull().sum().sum() > 0:
            if missing_strategy == "drop":
                df.dropna(inplace=True)
                logger.info("Dropped all rows with missing values.")
            else:
                for col in df.columns:
                    if df[col].isnull().sum() == 0:
                        continue
                    
                    # Fill numeric columns with Mean/Median/Mode
                    if pd.api.types.is_numeric_dtype(df[col]):
                        if missing_strategy == "mean":
                            val = df[col].mean()
                            df[col] = df[col].fillna(val)
                        elif missing_strategy == "median":
                            val = df[col].median()
                            df[col] = df[col].fillna(val)
                        elif missing_strategy == "mode":
                            mode_val = df[col].mode()
                            if not mode_val.empty:
                                df[col] = df[col].fillna(mode_val[0])
                    # For non-numeric columns, fill missing values with Mode or placeholder
                    else:
                        mode_val = df[col].mode()
                        if not mode_val.empty:
                            df[col] = df[col].fillna(mode_val[0])
                        else:
                            df[col] = df[col].fillna("Unknown")
                logger.info(f"Filled missing values using '{missing_strategy}' strategy.")

        # 4. Export Processed File
        dir_name = os.path.dirname(file_path)
        base_name = os.path.basename(file_path)
        name_part, ext_part = os.path.splitext(base_name)
        
        processed_filename = f"{name_part}_processed{ext_part}"
        processed_path = os.path.join(dir_name, processed_filename)
        
        try:
            df.to_csv(processed_path, index=False)
            logger.info(f"Successfully exported clean file to: {processed_path}")
            return processed_path
        except Exception as e:
            logger.error(f"Error saving processed CSV: {str(e)}")
            raise ValueError(f"Failed to export processed CSV: {str(e)}")
