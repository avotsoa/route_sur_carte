import React, { useState } from 'react';
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonItem,
  IonLabel,
  IonText,
  IonSpinner,
  IonIcon,
} from '@ionic/react';
import { mailOutline, lockClosedOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const history = useHistory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      history.push('/tabs/map');
    } catch (err: any) {
      setError('Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div style={{ maxWidth: '400px', margin: '0 auto', paddingTop: '60px' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>🛣️ Travaux Routiers</h1>
          <h2 style={{ textAlign: 'center', color: '#666', marginBottom: '40px' }}>Antananarivo</h2>

          <form onSubmit={handleSubmit}>
            {error && (
              <IonText color="danger">
                <p style={{ textAlign: 'center', marginBottom: '20px' }}>{error}</p>
              </IonText>
            )}

            <IonItem>
              <IonIcon icon={mailOutline} slot="start" />
              <IonLabel position="floating">Adresse e-mail</IonLabel>
              <IonInput
                type="email"
                value={email}
                onIonChange={(e) => setEmail(e.detail.value || '')}
                required
              />
            </IonItem>

            <IonItem>
              <IonIcon icon={lockClosedOutline} slot="start" />
              <IonLabel position="floating">Mot de passe</IonLabel>
              <IonInput
                type="password"
                value={password}
                onIonChange={(e) => setPassword(e.detail.value || '')}
                required
              />
            </IonItem>

            <IonButton
              expand="block"
              type="submit"
              disabled={loading || !email || !password}
              style={{ marginTop: '30px' }}
            >
              {loading ? <IonSpinner name="crescent" /> : 'Se connecter'}
            </IonButton>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
