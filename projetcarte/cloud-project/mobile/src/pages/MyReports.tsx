import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonToggle,
  IonIcon,
  RefresherEventDetail,
} from '@ionic/react';
import { locationOutline, calendarOutline, cashOutline } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import api, { setAuthToken } from '../services/api';

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
  uid: string;
}

const MyReports: React.FC = () => {
  const { user, getToken } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [showOnlyMine]);

  const fetchReports = async () => {
    try {
      const token = await getToken();
      if (token) {
        setAuthToken(token);
      }

      let url = '/api/reports?limit=50';
      if (showOnlyMine && user) {
        url += `&uid=${user.uid}`;
      }

      const response = await api.get(url);
      setReports(response.data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
    await fetchReports();
    event.detail.complete();
  };

  const getStatusBadge = (status: string) => {
    const config = {
      new: { color: 'danger', label: 'Nouveau' },
      in_progress: { color: 'warning', label: 'En cours' },
      done: { color: 'success', label: 'Terminé' },
    };
    const { color, label } = config[status as keyof typeof config] || { color: 'medium', label: status };
    return <IonBadge color={color}>{label}</IonBadge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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
          <IonTitle>Mes signalements</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonItem>
          <IonLabel>Afficher uniquement mes signalements</IonLabel>
          <IonToggle
            checked={showOnlyMine}
            onIonChange={(e) => setShowOnlyMine(e.detail.checked)}
          />
        </IonItem>

        {reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>Aucun signalement trouvé</p>
          </div>
        ) : (
          <IonList>
            {reports.map((report) => (
              <IonItem key={report.id} lines="full">
                <div style={{ width: '100%', padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong>Signalement #{report.id}</strong>
                    {getStatusBadge(report.status)}
                  </div>
                  
                  {report.description && (
                    <p style={{ margin: '8px 0', color: '#333' }}>{report.description}</p>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '14px', color: '#666' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IonIcon icon={calendarOutline} />
                      {formatDate(report.created_at)}
                    </span>
                    
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IonIcon icon={locationOutline} />
                      {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                    </span>
                    
                    {report.surface && (
                      <span>{report.surface} m²</span>
                    )}
                    
                    {report.budget && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <IonIcon icon={cashOutline} />
                        {report.budget.toLocaleString('fr-FR')} Ar
                      </span>
                    )}
                  </div>

                  {report.company && (
                    <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#666' }}>
                      Entreprise: {report.company}
                    </p>
                  )}
                </div>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default MyReports;
