import React, { useState, useEffect } from 'react';
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
  IonSpinner,
  useIonToast,
} from '@ionic/react';
import { add, logOutOutline, locationOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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

const MapPage: React.FC = () => {
  const { logout, getToken } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
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

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setShowModal(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

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
