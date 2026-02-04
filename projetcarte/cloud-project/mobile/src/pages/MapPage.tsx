import React, { useState, useEffect, useRef } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonButtons,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonIcon,
  IonFab,
  IonFabButton,
  IonFabList,
  IonSpinner,
  useIonToast,
} from '@ionic/react';
import { add, logOutOutline, locationOutline, locateOutline, navigateOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { useAuth } from '../context/AuthContext';
import api, { setAuthToken } from '../services/api';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Report {
  id: number;
  latitude: number;
  longitude: number;
  description: string;
  surface: number;
  budget: number;
  company: string;
  status: string;
  created_at: string;
}

const LocationPicker: React.FC<{ onLocationSelect: (lat: number, lng: number) => void }> = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to fly to a location
const FlyToLocation: React.FC<{ position: [number, number] | null; zoom?: number }> = ({ position, zoom = 16 }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom, { duration: 1.5 });
    }
  }, [position, map, zoom]);
  
  return null;
};

// User location marker (blue dot)
const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const MapPage: React.FC = () => {
  const { logout, getToken } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [flyToPosition, setFlyToPosition] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    surface: '',
    budget: '',
    company: '',
  });
  const [present] = useIonToast();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }
      const response = await api.get('/api/reports?limit=100');
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get current geolocation
  const getCurrentLocation = async () => {
    setLocating(true);
    try {
      // Request permissions first
      const permissionStatus = await Geolocation.checkPermissions();
      
      if (permissionStatus.location !== 'granted') {
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location !== 'granted') {
          present({
            message: 'Permission de localisation refusée',
            duration: 2000,
            color: 'warning',
          });
          setLocating(false);
          return;
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      
      const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
      setUserLocation(coords);
      setFlyToPosition(coords);
      
      present({
        message: 'Position trouvée',
        duration: 1500,
        color: 'success',
      });
    } catch (error: any) {
      console.error('Geolocation error:', error);
      present({
        message: error.message || 'Impossible d\'obtenir la position',
        duration: 2000,
        color: 'danger',
      });
    } finally {
      setLocating(false);
    }
  };

  // Use current location for new report
  const useLocationForReport = async () => {
    setLocating(true);
    try {
      const permissionStatus = await Geolocation.checkPermissions();
      
      if (permissionStatus.location !== 'granted') {
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location !== 'granted') {
          present({
            message: 'Permission de localisation refusée',
            duration: 2000,
            color: 'warning',
          });
          setLocating(false);
          return;
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      
      const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
      setUserLocation(coords);
      setSelectedPosition(coords);
      setFlyToPosition(coords);
      setShowModal(true);
      
      present({
        message: 'Position actuelle sélectionnée',
        duration: 1500,
        color: 'success',
      });
    } catch (error: any) {
      console.error('Geolocation error:', error);
      present({
        message: error.message || 'Impossible d\'obtenir la position',
        duration: 2000,
        color: 'danger',
      });
    } finally {
      setLocating(false);
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setSelectedPosition([lat, lng]);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!selectedPosition) return;

    try {
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      await api.post('/api/reports', {
        latitude: selectedPosition[0],
        longitude: selectedPosition[1],
        description: formData.description,
        surface: formData.surface ? parseFloat(formData.surface) : null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        company: formData.company,
      });

      present({
        message: 'Signalement créé avec succès',
        duration: 2000,
        color: 'success',
      });

      setShowModal(false);
      setSelectedPosition(null);
      setFormData({ description: '', surface: '', budget: '', company: '' });
      fetchReports();
    } catch (error) {
      present({
        message: 'Erreur lors de la création',
        duration: 2000,
        color: 'danger',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return '#ef4444';
      case 'in_progress': return '#f59e0b';
      case 'done': return '#22c55e';
      default: return '#3b82f6';
    }
  };

  const createIcon = (color: string) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <IonSpinner />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Carte</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={logout}>
              <IonIcon icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div style={{ height: '100%', width: '100%' }}>
          <MapContainer
            center={[-18.8792, 47.5079]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <LocationPicker onLocationSelect={handleLocationSelect} />
            <FlyToLocation position={flyToPosition} />
            {/* User location marker */}
            {userLocation && (
              <Marker position={userLocation} icon={userLocationIcon}>
                <Popup>Ma position</Popup>
              </Marker>
            )}
            {reports.map((report) => (
              <Marker
                key={report.id}
                position={[report.latitude, report.longitude]}
                icon={createIcon(getStatusColor(report.status))}
              >
                <Popup>
                  <div>
                    <strong>#{report.id}</strong>
                    <p>{report.description || 'Aucune description'}</p>
                    {report.surface && <p>Surface: {report.surface} m²</p>}
                    {report.budget && <p>Budget: {report.budget} Ar</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
            {selectedPosition && (
              <Marker position={selectedPosition} />
            )}
          </MapContainer>
        </div>

        {/* FAB with geolocation options */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton>
            <IonIcon icon={add} />
          </IonFabButton>
          <IonFabList side="top">
            <IonFabButton color="primary" onClick={getCurrentLocation} disabled={locating}>
              <IonIcon icon={locateOutline} />
            </IonFabButton>
            <IonFabButton color="success" onClick={useLocationForReport} disabled={locating}>
              <IonIcon icon={navigateOutline} />
            </IonFabButton>
          </IonFabList>
        </IonFab>

        {/* Loading indicator for geolocation */}
        {locating && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.9)',
            padding: '20px',
            borderRadius: '10px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}>
            <IonSpinner />
            <span>Localisation en cours...</span>
          </div>
        )}

        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>Nouveau signalement</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Fermer</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {selectedPosition && (
              <IonItem>
                <IonIcon icon={locationOutline} slot="start" />
                <IonLabel>
                  Position: {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
                </IonLabel>
              </IonItem>
            )}
            {!selectedPosition && (
              <p style={{ textAlign: 'center', color: '#666' }}>
                Cliquez sur la carte pour sélectionner une position
              </p>
            )}

            <IonItem>
              <IonLabel position="stacked">Description</IonLabel>
              <IonTextarea
                value={formData.description}
                onIonChange={(e) => setFormData({ ...formData, description: e.detail.value || '' })}
                rows={3}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Surface (m²)</IonLabel>
              <IonInput
                type="number"
                value={formData.surface}
                onIonChange={(e) => setFormData({ ...formData, surface: e.detail.value || '' })}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Budget (Ar)</IonLabel>
              <IonInput
                type="number"
                value={formData.budget}
                onIonChange={(e) => setFormData({ ...formData, budget: e.detail.value || '' })}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">Entreprise</IonLabel>
              <IonInput
                value={formData.company}
                onIonChange={(e) => setFormData({ ...formData, company: e.detail.value || '' })}
              />
            </IonItem>

            <IonButton
              expand="block"
              onClick={handleSubmit}
              disabled={!selectedPosition}
              style={{ marginTop: '20px' }}
            >
              Créer le signalement
            </IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default MapPage;
