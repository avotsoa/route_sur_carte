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
  IonGrid,
  IonRow,
  IonCol,
  IonImg,
  IonThumbnail,
  useIonToast,
  IonActionSheet,
} from '@ionic/react';
import { 
  add, 
  logOutOutline, 
  locationOutline, 
  locateOutline, 
  navigateOutline, 
  cameraOutline, 
  imageOutline, 
  closeCircle,
  trashOutline
} from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import api, { setAuthToken } from '../services/api';
import 'leaflet/dist/leaflet.css';

// Initialize Firebase for Storage (using same config as AuthContext)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
};

const app = initializeApp(firebaseConfig, 'storage-app');
const storage = getStorage(app);

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
  photos?: string[];
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
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

  const takePhoto = async (source: CameraSource) => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source
      });

      if (image.base64String) {
        uploadPhoto(image.base64String);
      }
    } catch (error) {
      console.error('Camera error:', error);
    }
  };

  const uploadPhoto = async (base64String: string) => {
    setUploading(true);
    try {
      const fileName = `report_${Date.now()}.jpg`;
      const storageRef = ref(storage, `reports/${fileName}`);
      
      // Convert base64 to blob
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      setPhotos(prev => [...prev, downloadURL]);
      
      present({
        message: 'Photo ajoutée',
        duration: 1500,
        color: 'success',
      });
    } catch (error) {
      console.error('Upload error:', error);
      present({
        message: 'Erreur lors de l\'upload',
        duration: 2000,
        color: 'danger',
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
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
        photos: photos,
      });

      present({
        message: 'Signalement créé avec succès',
        duration: 2000,
        color: 'success',
      });

      setShowModal(false);
      setSelectedPosition(null);
      setFormData({ description: '', surface: '', budget: '', company: '' });
      setPhotos([]);
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
                  <div style={{ minWidth: '150px' }}>
                    <strong>#{report.id}</strong>
                    <p>{report.description || 'Aucune description'}</p>
                    {report.photos && report.photos.length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', padding: '5px 0' }}>
                        {report.photos.map((url, i) => (
                          <img key={i} src={url} alt="Roadwork" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        ))}
                      </div>
                    )}
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

            {/* Photos Section */}
            <div style={{ marginTop: '20px' }}>
              <IonLabel style={{ marginLeft: '16px', fontSize: '14px', color: '#666' }}>Photos</IonLabel>
              <IonGrid>
                <IonRow>
                  {photos.map((url, index) => (
                    <IonCol size="4" key={index}>
                      <div style={{ position: 'relative' }}>
                        <IonThumbnail style={{ width: '100%', height: '80px' }}>
                          <IonImg src={url} />
                        </IonThumbnail>
                        <IonIcon
                          icon={closeCircle}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            fontSize: '24px',
                            color: 'red',
                            background: 'white',
                            borderRadius: '50%'
                          }}
                          onClick={() => removePhoto(index)}
                        />
                      </div>
                    </IonCol>
                  ))}
                  <IonCol size="4">
                    <div
                      onClick={() => setShowActionSheet(true)}
                      style={{
                        width: '100%',
                        height: '80px',
                        border: '2px dashed #ccc',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: '#666'
                      }}
                    >
                      {uploading ? (
                        <IonSpinner name="crescent" />
                      ) : (
                        <>
                          <IonIcon icon={cameraOutline} style={{ fontSize: '24px' }} />
                          <span style={{ fontSize: '10px' }}>Ajouter</span>
                        </>
                      )}
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            <IonButton
              expand="block"
              onClick={handleSubmit}
              disabled={!selectedPosition || uploading}
              style={{ marginTop: '20px' }}
            >
              {uploading ? 'Upload en cours...' : 'Créer le signalement'}
            </IonButton>

            <IonActionSheet
              isOpen={showActionSheet}
              onDidDismiss={() => setShowActionSheet(false)}
              header="Source de l'image"
              buttons={[
                {
                  text: 'Appareil photo',
                  icon: cameraOutline,
                  handler: () => takePhoto(CameraSource.Camera),
                },
                {
                  text: 'Galerie',
                  icon: imageOutline,
                  handler: () => takePhoto(CameraSource.Photos),
                },
                {
                  text: 'Annuler',
                  icon: closeCircle,
                  role: 'cancel',
                },
              ]}
            />
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default MapPage;
