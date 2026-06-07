"""
Synthetic road accident data generator with realistic noise patterns.
Customized for South East Nigeria (Enugu, Anambra, Imo, Abia, Ebonyi).
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random
from typing import Dict, List, Tuple, Optional
import geopandas as gpd
from shapely.geometry import Point, LineString
from scipy import stats


class SyntheticAccidentDataGenerator:
    """Generate realistic synthetic road accident data with controlled noise for SE Nigeria."""
    
    def __init__(self, seed: int = 42):
        """Initialize generator with random seed."""
        np.random.seed(seed)
        random.seed(seed)
        
        # Realistic parameters for accident generation
        self.road_types = ['highway', 'arterial', 'collector', 'local']
        self.road_type_risk = {
            'highway': 0.45,    # High speed, high risk (e.g. Enugu-Onitsha Expressway)
            'arterial': 0.35,   # Medium risk (e.g. urban dual carriageways)
            'collector': 0.25,  # Lower risk (e.g. connecting roads)
            'local': 0.15       # Lowest risk (e.g. streets, unpaved roads)
        }
        
        self.weather_conditions = ['clear', 'rain', 'harmattan', 'fog', 'wind']
        self.weather_risk = {
            'clear': 0.1,
            'rain': 0.4,       # Heavy tropical rain, slippery roads
            'harmattan': 0.35, # Poor visibility due to dust haze
            'fog': 0.3,        # Early morning fog in hilly areas (e.g., Milliken Hill)
            'wind': 0.2
        }
        
        self.time_periods = ['morning_rush', 'day', 'evening_rush', 'night']
        self.time_risk = {
            'morning_rush': 0.35, # 7am - 9am school/work rush
            'day': 0.2,
            'evening_rush': 0.4,  # 5pm - 8pm return rush, fatigue
            'night': 0.45         # Poor street lighting, armed robbery evasion speeding, trucks
        }
        
        # Base geographic area (South East Nigeria)
        self.base_bounds = {
            'min_lat': 5.0,
            'max_lat': 7.1,
            'min_lon': 6.6,
            'max_lon': 8.3
        }
        
        # Pre-defined high-risk zones (hotspots in SE Nigeria)
        self.hotspots = [
            {'name': 'Ninth Mile Corner, Enugu', 'center': (6.4167, 7.4167), 'radius': 0.04, 'risk_multiplier': 3.5},
            {'name': 'Onitsha Head Bridge', 'center': (6.1423, 6.7856), 'radius': 0.03, 'risk_multiplier': 4.0},
            {'name': 'Owerri Control Post', 'center': (5.4836, 7.0498), 'radius': 0.03, 'risk_multiplier': 2.8},
            {'name': 'Aba Osisioma Junction', 'center': (5.1450, 7.3320), 'radius': 0.035, 'risk_multiplier': 3.2},
            {'name': 'Awka Unizik Junction', 'center': (6.2440, 7.1180), 'radius': 0.025, 'risk_multiplier': 2.5},
            {'name': 'Umuahia Tower', 'center': (5.5167, 7.4833), 'radius': 0.02, 'risk_multiplier': 2.0},
            {'name': 'Ihiala Axis', 'center': (5.8700, 6.8500), 'radius': 0.025, 'risk_multiplier': 2.7}, # Notorious for accidents
            {'name': 'Ugwu Onyeama (Enugu)', 'center': (6.4350, 7.4500), 'radius': 0.02, 'risk_multiplier': 3.8} # Deadly hill
        ]
        
        # Road network simulation
        self.road_network = self._generate_road_network()
        
    def _generate_road_network(self) -> List[Dict]:
        """Generate a synthetic road network."""
        roads = []
        
        # Create main highways (simulating Enugu-Onitsha, Enugu-PH)
        for i in range(5):
            start_lon = self.base_bounds['min_lon'] + i * 0.3
            end_lon = self.base_bounds['min_lon'] + i * 0.3
            road = {
                'geometry': LineString([
                    (start_lon, self.base_bounds['min_lat']),
                    (end_lon, self.base_bounds['max_lat'])
                ]),
                'type': 'highway',
                'lanes': random.choice([2, 4]), # Nigerian highways are often 2 or 4 lanes
                'speed_limit': random.choice([80, 100]) # km/h
            }
            roads.append(road)
        
        # Create arterial roads
        for i in range(8):
            start_lat = self.base_bounds['min_lat'] + i * 0.25
            end_lat = self.base_bounds['min_lat'] + i * 0.25
            road = {
                'geometry': LineString([
                    (self.base_bounds['min_lon'], start_lat),
                    (self.base_bounds['max_lon'], end_lat)
                ]),
                'type': 'arterial',
                'lanes': random.choice([2, 3]),
                'speed_limit': random.choice([50, 60, 80])
            }
            roads.append(road)
            
        return roads
    
    def _calculate_base_risk(self, lat: float, lon: float, road_type: str, 
                            weather: str, time_period: str) -> float:
        """Calculate base accident risk for a location."""
        # Start with road type risk
        risk = self.road_type_risk[road_type]
        
        # Add weather effect
        risk *= (1 + self.weather_risk[weather])
        
        # Add time period effect
        risk *= (1 + self.time_risk[time_period])
        
        # Add hotspot effect
        for hotspot in self.hotspots:
            center_lat, center_lon = hotspot['center']
            distance = np.sqrt((lat - center_lat)**2 + (lon - center_lon)**2)
            if distance < hotspot['radius']:
                risk *= hotspot['risk_multiplier']
                break
        
        # Add random geographic variation
        geographic_variation = 0.8 + 0.4 * np.sin(lat * 100) * np.cos(lon * 100)
        risk *= geographic_variation
        
        return risk
    
    def _add_realistic_noise(self, risk: float, noise_level: float = 0.3) -> float:
        """
        Add realistic noise to risk prediction.
        noise_level controls how much noise to add (0-1).
        Higher noise_level reduces accuracy.
        """
        # Add different types of noise
        noise = 0
        
        # Random Gaussian noise
        noise += np.random.normal(0, noise_level * 0.5)
        
        # Systematic bias noise (simulating missing variables like bad potholes)
        bias_noise = noise_level * 0.4 * np.sin(risk * 15)
        noise += bias_noise
        
        # Outlier noise (rare but large errors, e.g., brake failure of a heavy truck)
        if np.random.random() < 0.08:  # 8% chance of outlier
            outlier_strength = np.random.choice([-1, 1]) * noise_level * 2.5
            noise += outlier_strength
        
        # Apply noise with saturation to keep risk in reasonable bounds
        noisy_risk = risk * (1 + noise)
        return max(0.01, min(0.99, noisy_risk))
    
    def generate_accident_record(self, record_id: int) -> Dict:
        """Generate a single synthetic accident record."""
        # Random location within SE Nigeria bounds
        lat = np.random.uniform(self.base_bounds['min_lat'], self.base_bounds['max_lat'])
        lon = np.random.uniform(self.base_bounds['min_lon'], self.base_bounds['max_lon'])
        
        # Random features
        road_type = random.choice(self.road_types)
        weather = random.choice(self.weather_conditions)
        time_period = random.choice(self.time_periods)
        
        # Calculate true risk
        true_risk = self._calculate_base_risk(lat, lon, road_type, weather, time_period)
        
        # Add realistic noise (targeting 70-80% accuracy)
        noise_level = 0.28
        observed_risk = self._add_realistic_noise(true_risk, noise_level)
        
        # Determine if accident occurs (binary outcome)
        accident_occurred = 1 if observed_risk > 0.5 else 0
        
        # Add some randomness to outcome for realism
        if np.random.random() < 0.12:  # 12% random flip
            accident_occurred = 1 - accident_occurred
        
        # Generate timestamp (within last 3 years)
        days_ago = np.random.randint(0, 1095)
        timestamp = datetime.now() - timedelta(days=days_ago)
        
        # Seasonal weather adjustment for Nigeria (Rainy vs Dry/Harmattan season)
        month = timestamp.month
        if 4 <= month <= 10: # Rainy season (April to October)
            weather = random.choices(
                ['rain', 'clear', 'fog', 'wind'], 
                weights=[0.6, 0.2, 0.1, 0.1]
            )[0]
        else: # Dry season / Harmattan (November to March)
            weather = random.choices(
                ['clear', 'harmattan', 'wind', 'fog'], 
                weights=[0.5, 0.35, 0.1, 0.05]
            )[0]
            
        # Additional features
        # SE Nigeria has many commercial buses (minibuses) and articulated trucks
        vehicle_count = np.random.poisson(1.5) + 1 
        severity = random.choice(['minor', 'moderate', 'severe', 'fatal'])
        
        # Road geometry features (SE Nigeria has hilly areas like Milliken Hill, Okigwe)
        curvature = np.random.exponential(1.2) # Higher curvature
        gradient = np.random.normal(0, 4.5)    # Steeper gradients
        
        # Traffic features
        traffic_volume = np.random.lognormal(mean=6.5, sigma=1.2)
        # Frequent traffic jams in commercial hubs (Aba, Onitsha)
        congestion_level = np.random.beta(3, 4) 
        
        # Road surface based on weather and poor maintenance
        road_surface_map = {
            'clear': 'dry',
            'rain': 'wet',
            'harmattan': 'dusty',
            'fog': 'wet',
            'wind': 'dry'
        }
        road_surface = road_surface_map.get(weather, 'dry')
        # Simulate potholes/bad roads
        if np.random.random() < 0.4:
            road_surface = 'potholed'
        
        # Lighting based on hour
        hour = timestamp.hour
        if 6 <= hour < 18:
            lighting = 'daylight'
        elif 18 <= hour < 19:
            lighting = 'dusk'
        else:
            # Often poor street lighting at night
            lighting = random.choices(['dark_no_lighting', 'dark_with_lighting'], weights=[0.8, 0.2])[0]
        
        return {
            'accident_id': record_id,
            'timestamp': timestamp,
            'latitude': lat,
            'longitude': lon,
            'road_type': road_type,
            'weather': weather,
            'time_period': time_period,
            'true_risk': true_risk,
            'observed_risk': observed_risk,
            'accident_occurred': accident_occurred,
            'vehicle_count': vehicle_count,
            'severity': severity,
            'road_curvature': curvature,
            'road_gradient': gradient,
            'traffic_volume': traffic_volume,
            'congestion_level': congestion_level,
            'day_of_week': timestamp.weekday(),
            'hour_of_day': timestamp.hour,
            'month': timestamp.month,
            'is_weekend': 1 if timestamp.weekday() >= 5 else 0,
            'visibility': np.random.uniform(0.3, 1.0) if weather != 'harmattan' else np.random.uniform(0.1, 0.5),
            'road_surface': road_surface,
            'lighting': lighting,
            'intersection_nearby': np.random.choice([0, 1], p=[0.6, 0.4]) # Many intersections
        }
    
    def generate_dataset(self, n_samples: int = 10000) -> pd.DataFrame:
        """
        Generate a complete synthetic dataset.
        
        Args:
            n_samples: Number of accident records to generate
            
        Returns:
            DataFrame with synthetic accident data
        """
        print(f"Generating {n_samples} realistic synthetic accident records for SE Nigeria...")
        
        records = []
        for i in range(n_samples):
            record = self.generate_accident_record(i)
            records.append(record)
            
            # Progress indicator
            if (i + 1) % 1000 == 0:
                print(f"  Generated {i + 1}/{n_samples} records...")
        
        df = pd.DataFrame(records)
        
        # Calculate dataset statistics
        accident_rate = df['accident_occurred'].mean()
        print(f"\nDataset Statistics:")
        print(f"  Total records: {len(df)}")
        print(f"  Accident rate: {accident_rate:.2%}")
        print(f"  Feature columns: {len(df.columns)}")
        print(f"  Date range: {df['timestamp'].min().date()} to {df['timestamp'].max().date()}")
        
        return df
    
    def generate_spatial_grid(self, grid_size: float = 0.05) -> gpd.GeoDataFrame:
        """
        Generate a spatial grid for hotspot prediction visualization.
        """
        lats = np.arange(self.base_bounds['min_lat'], 
                        self.base_bounds['max_lat'], 
                        grid_size)
        lons = np.arange(self.base_bounds['min_lon'], 
                        self.base_bounds['max_lon'], 
                        grid_size)
        
        grid_cells = []
        for i in range(len(lats) - 1):
            for j in range(len(lons) - 1):
                from shapely.geometry import Polygon
                polygon = Polygon([
                    (lons[j], lats[i]),
                    (lons[j+1], lats[i]),
                    (lons[j+1], lats[i+1]),
                    (lons[j], lats[i+1]),
                    (lons[j], lats[i])
                ])
                
                center_lat = (lats[i] + lats[i+1]) / 2
                center_lon = (lons[j] + lons[j+1]) / 2
                
                road_type = random.choice(self.road_types)
                weather = 'clear'
                time_period = 'day'
                
                risk = self._calculate_base_risk(center_lat, center_lon, 
                                                road_type, weather, time_period)
                
                grid_cells.append({
                    'geometry': polygon,
                    'center_lat': center_lat,
                    'center_lon': center_lon,
                    'predicted_risk': risk,
                    'cell_id': f"cell_{i}_{j}"
                })
        
        return gpd.GeoDataFrame(grid_cells, crs="EPSG:4326")


if __name__ == "__main__":
    # Example usage
    generator = SyntheticAccidentDataGenerator(seed=42)
    df = generator.generate_dataset(n_samples=5000)
    df.to_csv('synthetic_accident_data.csv', index=False)
    print(f"\nDataset saved to 'synthetic_accident_data.csv'")