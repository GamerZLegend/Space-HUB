import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    confusion_matrix,
    classification_report
)
from typing import Dict, List, Tuple, Any, Optional
import matplotlib.pyplot as plt
import seaborn as sns
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ModelEvaluator:
    def __init__(self, model_type: str):
        self.model_type = model_type
        self.metrics_history: Dict[str, List[float]] = {}
        self.evaluation_results: Dict[str, Any] = {}

    def evaluate_model(
        self,
        model: tf.keras.Model,
        X_test: np.ndarray,
        y_test: np.ndarray,
        threshold: float = 0.5
    ) -> Dict[str, float]:
        """Evaluate model performance"""
        try:
            # Get predictions
            y_pred = model.predict(X_test)
            
            if self.model_type == 'engagement_predictor':
                return self._evaluate_binary_classification(y_test, y_pred, threshold)
            elif self.model_type == 'quality_analyzer':
                return self._evaluate_regression(y_test, y_pred)
            elif self.model_type == 'content_recommender':
                return self._evaluate_recommender(y_test, y_pred, threshold)
            elif self.model_type == 'anomaly_detector':
                return self._evaluate_anomaly_detection(y_test, y_pred)
            else:
                raise ValueError(f"Unknown model type: {self.model_type}")

        except Exception as e:
            logger.error(f"Error in model evaluation: {str(e)}")
            raise

    def _evaluate_binary_classification(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        threshold: float
    ) -> Dict[str, float]:
        """Evaluate binary classification model"""
        # Convert probabilities to binary predictions
        y_pred_binary = (y_pred > threshold).astype(int)

        metrics = {
            'accuracy': accuracy_score(y_true, y_pred_binary),
            'precision': precision_score(y_true, y_pred_binary),
            'recall': recall_score(y_true, y_pred_binary),
            'f1': f1_score(y_true, y_pred_binary),
            'auc_roc': roc_auc_score(y_true, y_pred)
        }

        # Store confusion matrix
        self.evaluation_results['confusion_matrix'] = confusion_matrix(y_true, y_pred_binary)
        
        # Store classification report
        self.evaluation_results['classification_report'] = classification_report(
            y_true,
            y_pred_binary,
            output_dict=True
        )

        return metrics

    def _evaluate_regression(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray
    ) -> Dict[str, float]:
        """Evaluate regression model"""
        metrics = {
            'mse': mean_squared_error(y_true, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
            'mae': mean_absolute_error(y_true, y_pred),
            'r2': r2_score(y_true, y_pred)
        }

        # Store residuals
        self.evaluation_results['residuals'] = y_true - y_pred
        
        # Store prediction vs actual values
        self.evaluation_results['predictions_vs_actual'] = {
            'y_true': y_true,
            'y_pred': y_pred
        }

        return metrics

    def _evaluate_recommender(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        threshold: float
    ) -> Dict[str, float]:
        """Evaluate recommender model"""
        # Convert probabilities to binary predictions
        y_pred_binary = (y_pred > threshold).astype(int)

        metrics = {
            'precision': precision_score(y_true, y_pred_binary),
            'recall': recall_score(y_true, y_pred_binary),
            'f1': f1_score(y_true, y_pred_binary),
            'auc_roc': roc_auc_score(y_true, y_pred)
        }

        # Calculate additional recommender-specific metrics
        metrics.update(self._calculate_ranking_metrics(y_true, y_pred))

        return metrics

    def _evaluate_anomaly_detection(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray
    ) -> Dict[str, float]:
        """Evaluate anomaly detection model"""
        # Calculate reconstruction error
        reconstruction_error = np.mean(np.square(y_true - y_pred), axis=1)
        
        # Store reconstruction errors for threshold tuning
        self.evaluation_results['reconstruction_error'] = reconstruction_error

        metrics = {
            'mean_reconstruction_error': np.mean(reconstruction_error),
            'std_reconstruction_error': np.std(reconstruction_error),
            'max_reconstruction_error': np.max(reconstruction_error),
            'min_reconstruction_error': np.min(reconstruction_error)
        }

        return metrics

    def _calculate_ranking_metrics(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        k: int = 10
    ) -> Dict[str, float]:
        """Calculate ranking metrics for recommender systems"""
        # Sort predictions in descending order
        pred_indices = np.argsort(-y_pred, axis=0)
        
        # Calculate Precision@K
        precision_k = np.mean([
            np.sum(y_true[pred_indices[:k]]) / k
            for pred_indices in pred_indices
        ])

        # Calculate NDCG@K
        ndcg_k = np.mean([
            self._calculate_ndcg(y_true[pred_indices], k)
            for pred_indices in pred_indices
        ])

        return {
            f'precision@{k}': precision_k,
            f'ndcg@{k}': ndcg_k
        }

    def _calculate_ndcg(
        self,
        relevance_scores: np.ndarray,
        k: int
    ) -> float:
        """Calculate Normalized Discounted Cumulative Gain"""
        dcg = np.sum([
            (2 ** relevance_scores[i] - 1) / np.log2(i + 2)
            for i in range(min(k, len(relevance_scores)))
        ])
        
        # Calculate ideal DCG
        ideal_relevance_scores = np.sort(relevance_scores)[::-1]
        idcg = np.sum([
            (2 ** ideal_relevance_scores[i] - 1) / np.log2(i + 2)
            for i in range(min(k, len(ideal_relevance_scores)))
        ])
        
        return dcg / idcg if idcg > 0 else 0

    def plot_training_history(
        self,
        history: tf.keras.callbacks.History,
        save_path: Optional[str] = None
    ):
        """Plot training history"""
        try:
            metrics = history.history
            epochs = range(1, len(metrics['loss']) + 1)

            plt.figure(figsize=(12, 4))

            # Plot training & validation loss
            plt.subplot(1, 2, 1)
            plt.plot(epochs, metrics['loss'], 'b-', label='Training Loss')
            if 'val_loss' in metrics:
                plt.plot(epochs, metrics['val_loss'], 'r-', label='Validation Loss')
            plt.title('Model Loss')
            plt.xlabel('Epoch')
            plt.ylabel('Loss')
            plt.legend()

            # Plot training & validation metrics
            plt.subplot(1, 2, 2)
            for metric in metrics.keys():
                if metric not in ['loss', 'val_loss']:
                    plt.plot(epochs, metrics[metric], label=metric)
            plt.title('Model Metrics')
            plt.xlabel('Epoch')
            plt.ylabel('Score')
            plt.legend()

            plt.tight_layout()

            if save_path:
                plt.savefig(save_path)
            plt.close()

        except Exception as e:
            logger.error(f"Error plotting training history: {str(e)}")
            raise

    def plot_confusion_matrix(
        self,
        save_path: Optional[str] = None
    ):
        """Plot confusion matrix"""
        try:
            if 'confusion_matrix' not in self.evaluation_results:
                raise ValueError("Confusion matrix not available")

            plt.figure(figsize=(8, 6))
            sns.heatmap(
                self.evaluation_results['confusion_matrix'],
                annot=True,
                fmt='d',
                cmap='Blues'
            )
            plt.title('Confusion Matrix')
            plt.xlabel('Predicted')
            plt.ylabel('Actual')

            if save_path:
                plt.savefig(save_path)
            plt.close()

        except Exception as e:
            logger.error(f"Error plotting confusion matrix: {str(e)}")
            raise

    def plot_regression_results(
        self,
        save_path: Optional[str] = None
    ):
        """Plot regression results"""
        try:
            if 'predictions_vs_actual' not in self.evaluation_results:
                raise ValueError("Regression results not available")

            y_true = self.evaluation_results['predictions_vs_actual']['y_true']
            y_pred = self.evaluation_results['predictions_vs_actual']['y_pred']

            plt.figure(figsize=(12, 4))

            # Scatter plot
            plt.subplot(1, 2, 1)
            plt.scatter(y_true, y_pred, alpha=0.5)
            plt.plot([y_true.min(), y_true.max()], [y_true.min(), y_true.max()], 'r--', lw=2)
            plt.title('Predicted vs Actual Values')
            plt.xlabel('Actual Values')
            plt.ylabel('Predicted Values')

            # Residual plot
            plt.subplot(1, 2, 2)
            residuals = self.evaluation_results['residuals']
            plt.scatter(y_pred, residuals, alpha=0.5)
            plt.axhline(y=0, color='r', linestyle='--')
            plt.title('Residual Plot')
            plt.xlabel('Predicted Values')
            plt.ylabel('Residuals')

            plt.tight_layout()

            if save_path:
                plt.savefig(save_path)
            plt.close()

        except Exception as e:
            logger.error(f"Error plotting regression results: {str(e)}")
            raise

    def plot_anomaly_distribution(
        self,
        save_path: Optional[str] = None
    ):
        """Plot anomaly score distribution"""
        try:
            if 'reconstruction_error' not in self.evaluation_results:
                raise ValueError("Anomaly detection results not available")

            reconstruction_error = self.evaluation_results['reconstruction_error']

            plt.figure(figsize=(10, 6))
            sns.histplot(reconstruction_error, bins=50, kde=True)
            plt.title('Reconstruction Error Distribution')
            plt.xlabel('Reconstruction Error')
            plt.ylabel('Count')

            if save_path:
                plt.savefig(save_path)
            plt.close()

        except Exception as e:
            logger.error(f"Error plotting anomaly distribution: {str(e)}")
            raise

    def save_evaluation_report(
        self,
        metrics: Dict[str, float],
        save_path: str
    ):
        """Save evaluation report"""
        try:
            report = {
                'model_type': self.model_type,
                'evaluation_date': datetime.now().isoformat(),
                'metrics': metrics,
                'additional_results': {}
            }

            # Add model-specific results
            if self.model_type == 'engagement_predictor':
                report['additional_results']['classification_report'] = \
                    self.evaluation_results.get('classification_report', {})
            
            elif self.model_type == 'quality_analyzer':
                report['additional_results']['prediction_stats'] = {
                    'mean_error': float(np.mean(self.evaluation_results.get('residuals', []))),
                    'std_error': float(np.std(self.evaluation_results.get('residuals', [])))
                }
            
            elif self.model_type == 'anomaly_detector':
                reconstruction_error = self.evaluation_results.get('reconstruction_error', [])
                report['additional_results']['anomaly_stats'] = {
                    'mean_error': float(np.mean(reconstruction_error)),
                    'std_error': float(np.std(reconstruction_error)),
                    'percentiles': {
                        '95th': float(np.percentile(reconstruction_error, 95)),
                        '99th': float(np.percentile(reconstruction_error, 99))
                    }
                }

            # Save report
            with open(save_path, 'w') as f:
                import json
                json.dump(report, f, indent=4)

        except Exception as e:
            logger.error(f"Error saving evaluation report: {str(e)}")
            raise
