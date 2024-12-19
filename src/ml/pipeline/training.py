import os
import logging
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from typing import Dict, List, Tuple, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLPipeline:
    def __init__(
        self,
        config: Dict[str, Any],
        model_type: str,
        version: str,
    ):
        self.config = config
        self.model_type = model_type
        self.version = version
        self.model = None
        self.scaler = StandardScaler()
        
        # Initialize TensorFlow settings
        self._setup_tensorflow()

    def _setup_tensorflow(self):
        """Configure TensorFlow settings"""
        # Enable mixed precision training
        tf.keras.mixed_precision.set_global_policy('mixed_float16')
        
        # Set memory growth for GPUs
        gpus = tf.config.list_physical_devices('GPU')
        if gpus:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)

    def prepare_data(
        self,
        data: pd.DataFrame,
        target_column: str,
        feature_columns: List[str]
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Prepare data for training"""
        logger.info(f"Preparing data for {self.model_type} model")
        
        # Split features and target
        X = data[feature_columns].values
        y = data[target_column].values
        
        # Scale features
        X = self.scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=self.config['test_size'],
            random_state=self.config['random_state']
        )
        
        return X_train, X_test, y_train, y_test

    def build_model(self, input_shape: Tuple[int, ...]) -> tf.keras.Model:
        """Build the neural network model"""
        logger.info(f"Building {self.model_type} model")
        
        if self.model_type == 'engagement_predictor':
            return self._build_engagement_predictor(input_shape)
        elif self.model_type == 'quality_analyzer':
            return self._build_quality_analyzer(input_shape)
        elif self.model_type == 'content_recommender':
            return self._build_content_recommender(input_shape)
        elif self.model_type == 'anomaly_detector':
            return self._build_anomaly_detector(input_shape)
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")

    def _build_engagement_predictor(self, input_shape: Tuple[int, ...]) -> tf.keras.Model:
        """Build engagement prediction model"""
        inputs = tf.keras.Input(shape=input_shape)
        
        x = tf.keras.layers.Dense(256, activation='relu')(inputs)
        x = tf.keras.layers.Dropout(0.3)(x)
        x = tf.keras.layers.Dense(128, activation='relu')(x)
        x = tf.keras.layers.Dropout(0.2)(x)
        x = tf.keras.layers.Dense(64, activation='relu')(x)
        
        outputs = tf.keras.layers.Dense(1, activation='sigmoid')(x)
        
        return tf.keras.Model(inputs=inputs, outputs=outputs)

    def _build_quality_analyzer(self, input_shape: Tuple[int, ...]) -> tf.keras.Model:
        """Build quality analysis model"""
        inputs = tf.keras.Input(shape=input_shape)
        
        x = tf.keras.layers.Dense(128, activation='relu')(inputs)
        x = tf.keras.layers.Dense(64, activation='relu')(x)
        x = tf.keras.layers.Dense(32, activation='relu')(x)
        
        quality_score = tf.keras.layers.Dense(1, activation='sigmoid', name='quality')(x)
        issues = tf.keras.layers.Dense(self.config['num_issue_classes'], activation='sigmoid', name='issues')(x)
        
        return tf.keras.Model(inputs=inputs, outputs=[quality_score, issues])

    def _build_content_recommender(self, input_shape: Tuple[int, ...]) -> tf.keras.Model:
        """Build content recommendation model"""
        user_input = tf.keras.Input(shape=(input_shape[0],))
        content_input = tf.keras.Input(shape=(input_shape[1],))
        
        # User embedding
        user_embedding = tf.keras.layers.Dense(64, activation='relu')(user_input)
        user_embedding = tf.keras.layers.Dropout(0.3)(user_embedding)
        
        # Content embedding
        content_embedding = tf.keras.layers.Dense(64, activation='relu')(content_input)
        content_embedding = tf.keras.layers.Dropout(0.3)(content_embedding)
        
        # Combine embeddings
        concatenated = tf.keras.layers.Concatenate()([user_embedding, content_embedding])
        
        x = tf.keras.layers.Dense(128, activation='relu')(concatenated)
        x = tf.keras.layers.Dropout(0.2)(x)
        x = tf.keras.layers.Dense(64, activation='relu')(x)
        
        outputs = tf.keras.layers.Dense(1, activation='sigmoid')(x)
        
        return tf.keras.Model(inputs=[user_input, content_input], outputs=outputs)

    def _build_anomaly_detector(self, input_shape: Tuple[int, ...]) -> tf.keras.Model:
        """Build anomaly detection model"""
        inputs = tf.keras.Input(shape=input_shape)
        
        # Encoder
        x = tf.keras.layers.Dense(128, activation='relu')(inputs)
        x = tf.keras.layers.Dense(64, activation='relu')(x)
        encoded = tf.keras.layers.Dense(32, activation='relu')(x)
        
        # Decoder
        x = tf.keras.layers.Dense(64, activation='relu')(encoded)
        x = tf.keras.layers.Dense(128, activation='relu')(x)
        outputs = tf.keras.layers.Dense(input_shape[0], activation='sigmoid')(x)
        
        return tf.keras.Model(inputs=inputs, outputs=outputs)

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray
    ) -> tf.keras.callbacks.History:
        """Train the model"""
        logger.info(f"Training {self.model_type} model")
        
        # Build model if not already built
        if self.model is None:
            self.model = self.build_model(X_train.shape[1:])
        
        # Compile model
        self.model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=self.config['learning_rate']),
            loss=self.config['loss'],
            metrics=self.config['metrics']
        )
        
        # Setup callbacks
        callbacks = self._setup_callbacks()
        
        # Train model
        history = self.model.fit(
            X_train,
            y_train,
            validation_data=(X_val, y_val),
            batch_size=self.config['batch_size'],
            epochs=self.config['epochs'],
            callbacks=callbacks,
            verbose=1
        )
        
        return history

    def _setup_callbacks(self) -> List[tf.keras.callbacks.Callback]:
        """Setup training callbacks"""
        callbacks = []
        
        # Model checkpoint
        checkpoint = ModelCheckpoint(
            f'models/{self.model_type}/v{self.version}/checkpoint',
            monitor='val_loss',
            save_best_only=True,
            mode='min',
            verbose=1
        )
        callbacks.append(checkpoint)
        
        # Early stopping
        early_stopping = EarlyStopping(
            monitor='val_loss',
            patience=self.config['early_stopping_patience'],
            restore_best_weights=True,
            verbose=1
        )
        callbacks.append(early_stopping)
        
        # Learning rate reduction
        reduce_lr = ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.2,
            patience=5,
            min_lr=1e-6,
            verbose=1
        )
        callbacks.append(reduce_lr)
        
        return callbacks

    def evaluate(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, float]:
        """Evaluate the model"""
        logger.info(f"Evaluating {self.model_type} model")
        
        # Evaluate model
        results = self.model.evaluate(X_test, y_test, verbose=0)
        
        # Create metrics dictionary
        metrics = {}
        for metric_name, metric_value in zip(self.model.metrics_names, results):
            metrics[metric_name] = float(metric_value)
        
        return metrics

    def save(self, path: str):
        """Save the model and scaler"""
        logger.info(f"Saving {self.model_type} model")
        
        # Create directories if they don't exist
        os.makedirs(path, exist_ok=True)
        
        # Save model
        self.model.save(os.path.join(path, 'model'))
        
        # Save scaler
        import joblib
        joblib.dump(self.scaler, os.path.join(path, 'scaler.pkl'))
        
        # Save config
        import json
        with open(os.path.join(path, 'config.json'), 'w') as f:
            json.dump(self.config, f)

    def load(self, path: str):
        """Load the model and scaler"""
        logger.info(f"Loading {self.model_type} model")
        
        # Load model
        self.model = tf.keras.models.load_model(os.path.join(path, 'model'))
        
        # Load scaler
        import joblib
        self.scaler = joblib.load(os.path.join(path, 'scaler.pkl'))
        
        # Load config
        import json
        with open(os.path.join(path, 'config.json'), 'r') as f:
            self.config = json.load(f)

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions"""
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Make predictions
        return self.model.predict(X_scaled)
