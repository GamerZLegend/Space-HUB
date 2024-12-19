import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from typing import List, Dict, Tuple, Any
import logging

logger = logging.getLogger(__name__)

class DataPreprocessor:
    def __init__(self):
        self.scalers: Dict[str, Any] = {}
        self.encoders: Dict[str, Any] = {}
        self.vectorizers: Dict[str, Any] = {}
        self.feature_names: List[str] = []

    def fit_transform(self, data: pd.DataFrame, config: Dict[str, Any]) -> pd.DataFrame:
        """Fit and transform the data"""
        try:
            processed_data = data.copy()

            # Handle missing values
            processed_data = self._handle_missing_values(processed_data, config['missing_values'])

            # Encode categorical variables
            if 'categorical_features' in config:
                processed_data = self._encode_categorical_features(
                    processed_data,
                    config['categorical_features']
                )

            # Scale numerical features
            if 'numerical_features' in config:
                processed_data = self._scale_numerical_features(
                    processed_data,
                    config['numerical_features'],
                    config.get('scaling_method', 'standard')
                )

            # Process text features
            if 'text_features' in config:
                processed_data = self._process_text_features(
                    processed_data,
                    config['text_features']
                )

            # Generate time-based features
            if 'time_features' in config:
                processed_data = self._generate_time_features(
                    processed_data,
                    config['time_features']
                )

            # Feature engineering
            if 'engineered_features' in config:
                processed_data = self._engineer_features(
                    processed_data,
                    config['engineered_features']
                )

            self.feature_names = processed_data.columns.tolist()
            return processed_data

        except Exception as e:
            logger.error(f"Error in data preprocessing: {str(e)}")
            raise

    def transform(self, data: pd.DataFrame) -> pd.DataFrame:
        """Transform new data using fitted preprocessors"""
        try:
            processed_data = data.copy()

            # Apply categorical encoding
            for feature, encoder in self.encoders.items():
                if feature in processed_data.columns:
                    processed_data[feature] = encoder.transform(processed_data[feature])

            # Apply numerical scaling
            for feature, scaler in self.scalers.items():
                if feature in processed_data.columns:
                    processed_data[feature] = scaler.transform(processed_data[feature].values.reshape(-1, 1))

            # Apply text vectorization
            for feature, vectorizer in self.vectorizers.items():
                if feature in processed_data.columns:
                    vectorized = vectorizer.transform(processed_data[feature])
                    feature_names = [f"{feature}_tfidf_{i}" for i in range(vectorized.shape[1])]
                    processed_data = pd.concat([
                        processed_data,
                        pd.DataFrame(vectorized.toarray(), columns=feature_names)
                    ], axis=1)
                    processed_data.drop(columns=[feature], inplace=True)

            return processed_data[self.feature_names]

        except Exception as e:
            logger.error(f"Error in data transformation: {str(e)}")
            raise

    def _handle_missing_values(
        self,
        data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> pd.DataFrame:
        """Handle missing values in the dataset"""
        for feature, strategy in config.items():
            if feature not in data.columns:
                continue

            if strategy == 'drop':
                data.dropna(subset=[feature], inplace=True)
            elif strategy == 'mean':
                data[feature].fillna(data[feature].mean(), inplace=True)
            elif strategy == 'median':
                data[feature].fillna(data[feature].median(), inplace=True)
            elif strategy == 'mode':
                data[feature].fillna(data[feature].mode()[0], inplace=True)
            elif isinstance(strategy, (int, float, str)):
                data[feature].fillna(strategy, inplace=True)

        return data

    def _encode_categorical_features(
        self,
        data: pd.DataFrame,
        categorical_features: List[str]
    ) -> pd.DataFrame:
        """Encode categorical features"""
        for feature in categorical_features:
            if feature not in data.columns:
                continue

            encoder = LabelEncoder()
            data[feature] = encoder.fit_transform(data[feature])
            self.encoders[feature] = encoder

        return data

    def _scale_numerical_features(
        self,
        data: pd.DataFrame,
        numerical_features: List[str],
        method: str = 'standard'
    ) -> pd.DataFrame:
        """Scale numerical features"""
        for feature in numerical_features:
            if feature not in data.columns:
                continue

            if method == 'standard':
                scaler = StandardScaler()
            elif method == 'minmax':
                scaler = MinMaxScaler()
            else:
                raise ValueError(f"Unknown scaling method: {method}")

            data[feature] = scaler.fit_transform(data[feature].values.reshape(-1, 1))
            self.scalers[feature] = scaler

        return data

    def _process_text_features(
        self,
        data: pd.DataFrame,
        text_features: List[str]
    ) -> pd.DataFrame:
        """Process text features using TF-IDF"""
        for feature in text_features:
            if feature not in data.columns:
                continue

            vectorizer = TfidfVectorizer(
                max_features=100,
                stop_words='english',
                lowercase=True,
                strip_accents='unicode'
            )
            
            vectorized = vectorizer.fit_transform(data[feature].fillna(''))
            feature_names = [f"{feature}_tfidf_{i}" for i in range(vectorized.shape[1])]
            
            data = pd.concat([
                data,
                pd.DataFrame(vectorized.toarray(), columns=feature_names)
            ], axis=1)
            
            data.drop(columns=[feature], inplace=True)
            self.vectorizers[feature] = vectorizer

        return data

    def _generate_time_features(
        self,
        data: pd.DataFrame,
        time_features: List[Dict[str, Any]]
    ) -> pd.DataFrame:
        """Generate time-based features"""
        for feature_config in time_features:
            feature = feature_config['feature']
            if feature not in data.columns:
                continue

            # Convert to datetime if needed
            if not pd.api.types.is_datetime64_any_dtype(data[feature]):
                data[feature] = pd.to_datetime(data[feature])

            # Extract common time features
            if feature_config.get('hour_of_day', False):
                data[f"{feature}_hour"] = data[feature].dt.hour
            if feature_config.get('day_of_week', False):
                data[f"{feature}_day_of_week"] = data[feature].dt.dayofweek
            if feature_config.get('month', False):
                data[f"{feature}_month"] = data[feature].dt.month
            if feature_config.get('year', False):
                data[f"{feature}_year"] = data[feature].dt.year
            if feature_config.get('is_weekend', False):
                data[f"{feature}_is_weekend"] = data[feature].dt.dayofweek.isin([5, 6]).astype(int)

            # Drop original time feature if specified
            if feature_config.get('drop_original', True):
                data.drop(columns=[feature], inplace=True)

        return data

    def _engineer_features(
        self,
        data: pd.DataFrame,
        feature_configs: List[Dict[str, Any]]
    ) -> pd.DataFrame:
        """Engineer new features"""
        for config in feature_configs:
            feature_type = config['type']
            
            if feature_type == 'interaction':
                data = self._create_interaction_features(data, config)
            elif feature_type == 'aggregation':
                data = self._create_aggregation_features(data, config)
            elif feature_type == 'window':
                data = self._create_window_features(data, config)
            elif feature_type == 'custom':
                data = self._create_custom_features(data, config)

        return data

    def _create_interaction_features(
        self,
        data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> pd.DataFrame:
        """Create interaction features between multiple columns"""
        features = config['features']
        operations = config.get('operations', ['multiply'])

        for op in operations:
            if op == 'multiply':
                feature_name = f"{'_x_'.join(features)}"
                data[feature_name] = data[features].prod(axis=1)
            elif op == 'divide':
                feature_name = f"{features[0]}_div_{features[1]}"
                data[feature_name] = data[features[0]] / data[features[1]].replace(0, np.nan)
            elif op == 'add':
                feature_name = f"{'_plus_'.join(features)}"
                data[feature_name] = data[features].sum(axis=1)
            elif op == 'subtract':
                feature_name = f"{features[0]}_minus_{features[1]}"
                data[feature_name] = data[features[0]] - data[features[1]]

        return data

    def _create_aggregation_features(
        self,
        data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> pd.DataFrame:
        """Create aggregation features"""
        group_by = config['group_by']
        agg_features = config['features']
        operations = config.get('operations', ['mean'])

        for feature in agg_features:
            for op in operations:
                feature_name = f"{feature}_{op}_by_{group_by}"
                data[feature_name] = data.groupby(group_by)[feature].transform(op)

        return data

    def _create_window_features(
        self,
        data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> pd.DataFrame:
        """Create window-based features"""
        features = config['features']
        window_size = config['window_size']
        operations = config.get('operations', ['mean'])

        for feature in features:
            for op in operations:
                feature_name = f"{feature}_{op}_{window_size}w"
                if op == 'mean':
                    data[feature_name] = data[feature].rolling(window=window_size).mean()
                elif op == 'std':
                    data[feature_name] = data[feature].rolling(window=window_size).std()
                elif op == 'min':
                    data[feature_name] = data[feature].rolling(window=window_size).min()
                elif op == 'max':
                    data[feature_name] = data[feature].rolling(window=window_size).max()

        return data

    def _create_custom_features(
        self,
        data: pd.DataFrame,
        config: Dict[str, Any]
    ) -> pd.DataFrame:
        """Create custom features using provided lambda functions"""
        feature_name = config['name']
        function = eval(config['function'])  # Be careful with eval!
        features = config['features']

        data[feature_name] = data[features].apply(function, axis=1)
        return data
