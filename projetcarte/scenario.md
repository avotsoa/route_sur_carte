## 7. Scénarios d'utilisation

### Scénario 1 : Visiteur consulte la carte

1. Accéder à http://localhost:5173
2. La carte d'Antananarivo s'affiche avec les points de signalement
3. Survoler un point pour voir les détails :
   - Date de signalement
   - Statut (nouveau/en cours/terminé)
   - Surface en m²
   - Budget en Ariary
   - Entreprise concernée
4. Consulter le récapitulatif dans la sidebar :
   - Nombre total de signalements
   - Surface totale
   - Budget total
   - Pourcentage d'avancement

  

### Scénario 2 : Manager gère les signalements

1. Se connecter avec le compte manager
2. Accéder au Dashboard
3. Visualiser les statistiques et graphiques
4. Aller dans "Signalements"
5. Modifier le statut d'un signalement (nouveau → en cours)
6. Mettre à jour la surface, le budget, l'entreprise
7. Cliquer sur "Synchroniser" pour envoyer vers Firebase

### Scénario 3 : Manager crée un utilisateur

1. Se connecter en tant que manager
2. Aller dans "Utilisateurs"
3. Cliquer sur "Créer un utilisateur"
4. Remplir le formulaire :
   - Prénom, Nom
   - Email
   - Mot de passe (min 6 caractères)
   - Rôle (Utilisateur ou Manager)
5. L'utilisateur peut maintenant se connecter sur le mobile

### Scénario 4 : Utilisateur mobile signale un problème

1. Ouvrir l'application mobile
2. Se connecter via Firebase
3. Sur la carte, utiliser le bouton de géolocalisation (📍)
4. Ou cliquer directement sur la carte pour choisir un point
5. Remplir le formulaire :
   - Description du problème
   - Surface estimée
   - Budget estimé
   - Entreprise (optionnel)
6. Le signalement est envoyé à l'API

### Scénario 5 : Déblocage d'un utilisateur

1. Un utilisateur échoue 3 fois sa connexion → compte bloqué
2. Le manager se connecte sur l'application web
3. Accède à "Utilisateurs bloqués"
4. Clique sur "Débloquer" à côté de l'utilisateur concerné
5. L'utilisateur peut à nouveau se connecter

---
