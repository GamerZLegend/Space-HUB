from typing import Dict, Any

class ModelConfig:
    @staticmethod
    def get_config(model_type: str) -> Dict[str, Any]:
        """Get model configuration based on model type"""
        base_config = {
            'random_state': 42,
            'test_size': 0.2,
            'batch_size': 32,
            'epochs': 100,
            'early_stopping_patience': 10,
            'learning_rate': 0.001,
        }

        if model_type == 'engagement_predictor':
            return {
                **base_config,
                'loss': 'binary_crossentropy',
                'metrics': ['accuracy', 'AUC', 'Precision', 'Recall'],
                'architecture': {
                    'hidden_layers': [256, 128, 64],
                    'dropout_rates': [0.3, 0.2, 0.1],
                },
                'feature_columns': [
                    'viewer_count',
                    'chat_messages',
                    'stream_duration',
                    'peak_viewers',
                    'average_watch_time',
                    'interaction_rate',
                    'follower_count',
                    'subscriber_count',
                    'stream_quality_score',
                    'time_of_day',
                    'day_of_week',
                    'is_weekend',
                    'category_encoded',
                    'language_encoded',
                    'platform_encoded'
                ]
            }

        elif model_type == 'quality_analyzer':
            return {
                **base_config,
                'loss': {
                    'quality': 'mse',
                    'issues': 'binary_crossentropy'
                },
                'loss_weights': {
                    'quality': 1.0,
                    'issues': 0.5
                },
                'metrics': {
                    'quality': ['mse', 'mae'],
                    'issues': ['accuracy', 'AUC']
                },
                'num_issue_classes': 8,
                'architecture': {
                    'hidden_layers': [128, 64, 32],
                    'dropout_rates': [0.3, 0.2, 0.1],
                },
                'feature_columns': [
                    'bitrate',
                    'fps',
                    'resolution_width',
                    'resolution_height',
                    'encoder_cpu_usage',
                    'encoder_gpu_usage',
                    'dropped_frames',
                    'buffer_size',
                    'network_latency',
                    'bandwidth_usage',
                    'gpu_temperature',
                    'cpu_temperature',
                    'memory_usage',
                    'disk_usage'
                ]
            }

        elif model_type == 'content_recommender':
            return {
                **base_config,
                'loss': 'binary_crossentropy',
                'metrics': ['accuracy', 'AUC', 'Precision', 'Recall'],
                'embedding_dim': 64,
                'architecture': {
                    'hidden_layers': [128, 64],
                    'dropout_rates': [0.3, 0.2],
                },
                'user_features': [
                    'age',
                    'gender_encoded',
                    'location_encoded',
                    'language_encoded',
                    'device_type_encoded',
                    'watch_time',
                    'engagement_rate',
                    'category_preferences',
                    'platform_preferences',
                    'time_of_day_preference',
                    'session_duration_avg'
                ],
                'content_features': [
                    'category_encoded',
                    'tags_encoded',
                    'language_encoded',
                    'duration',
                    'quality_score',
                    'engagement_score',
                    'popularity_score',
                    'freshness_score',
                    'similarity_features'
                ]
            }

        elif model_type == 'anomaly_detector':
            return {
                **base_config,
                'loss': 'mse',
                'metrics': ['mse', 'mae'],
                'architecture': {
                    'encoder_layers': [128, 64, 32],
                    'decoder_layers': [64, 128],
                    'activation': 'relu',
                    'dropout_rate': 0.2,
                },
                'anomaly_threshold': 0.3,
                'feature_columns': [
                    'cpu_usage',
                    'memory_usage',
                    'gpu_usage',
                    'network_throughput',
                    'disk_io',
                    'error_rate',
                    'latency',
                    'request_rate',
                    'response_time',
                    'queue_length',
                    'cache_hits',
                    'cache_misses',
                    'active_connections',
                    'failed_requests',
                    'system_load'
                ]
            }

        else:
            raise ValueError(f"Unknown model type: {model_type}")

    @staticmethod
    def get_training_config() -> Dict[str, Any]:
        """Get training configuration"""
        return {
            'data_augmentation': {
                'enabled': True,
                'techniques': [
                    'random_noise',
                    'time_shift',
                    'feature_dropout'
                ]
            },
            'optimization': {
                'mixed_precision': True,
                'xla_acceleration': True,
                'parallel_training': True,
                'gradient_accumulation_steps': 4
            },
            'hardware': {
                'gpu_memory_growth': True,
                'multi_gpu_strategy': 'mirrored',
                'mixed_precision_policy': 'mixed_float16'
            },
            'monitoring': {
                'tensorboard': True,
                'profile_batch': '2,5',
                'log_every_n_steps': 100
            },
            'checkpointing': {
                'save_best_only': True,
                'save_weights_only': False,
                'save_frequency': 'epoch'
            },
            'early_stopping': {
                'monitor': 'val_loss',
                'patience': 10,
                'min_delta': 1e-4,
                'restore_best_weights': True
            },
            'learning_rate_schedule': {
                'initial_learning_rate': 0.001,
                'decay_steps': 1000,
                'decay_rate': 0.9,
                'staircase': False
            },
            'validation': {
                'validation_split': 0.2,
                'cross_validation_folds': 5,
                'stratify': True
            }
        }

    @staticmethod
    def get_inference_config() -> Dict[str, Any]:
        """Get inference configuration"""
        return {
            'batch_size': 32,
            'num_threads': 4,
            'timeout': 30,
            'max_queue_size': 100,
            'cache_size': '2GB',
            'warmup_steps': 10,
            'optimization': {
                'mixed_precision': True,
                'xla_acceleration': True,
                'graph_optimization': True,
                'parallel_inference': True
            },
            'monitoring': {
                'latency_threshold_ms': 100,
                'error_threshold': 0.01,
                'throughput_threshold': 1000
            },
            'caching': {
                'enabled': True,
                'ttl_seconds': 3600,
                'max_entries': 10000
            },
            'fallback': {
                'enabled': True,
                'max_retries': 3,
                'timeout_ms': 200
            }
        }
