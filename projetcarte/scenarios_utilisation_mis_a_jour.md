## 7. Scénarios d'utilisation

### Scénario 1 : Inscription d’un utilisateur (API Auth)
1. L’utilisateur envoie une requête POST /auth/register
2. Il fournit email et mot de passe
3. L’API valide les données
4. Le compte est créé dans PostgreSQL
5. Une réponse de succès est retournée

### Scénario 2 : Authentification utilisateur (API Auth)
1. L’utilisateur envoie POST /auth/login
2. L’API vérifie les identifiants
3. Une session est créée avec une durée de vie définie
4. Un token est retourné

### Scénario 3 : Blocage après tentatives échouées
1. L’utilisateur échoue 3 fois à se connecter
2. Le compte est bloqué
3. Une réponse d’erreur est retournée

### Scénario 4 : Déblocage d’un utilisateur
1. Le manager se connecte
2. Accède à Utilisateurs bloqués
3. Clique sur Débloquer
4. Le compte redevient actif

### Scénario 5 : Visiteur consulte la carte (Web)
1. Accéder à l’application web
2. Visualiser la carte d’Antananarivo
3. Survoler un point pour voir les détails
4. Consulter le tableau récapitulatif

### Scénario 6 : Manager gère les signalements
1. Connexion manager
2. Consultation des signalements
3. Modification du statut
4. Mise à jour surface, budget, entreprise
5. Synchronisation Firebase

### Scénario 7 : Calcul de l’avancement
1. Le manager change le statut
2. Nouveau = 0%, En cours = 50%, Terminé = 100%
3. Les statistiques sont mises à jour

### Scénario 8 : Statistiques manager
1. Accéder au tableau de statistiques
2. Visualiser le délai moyen de traitement
3. Consulter l’avancement global

### Scénario 9 : Synchronisation Firebase
1. Récupération des signalements en ligne
2. Envoi des données vers Firebase
3. Synchronisation des comptes mobiles

### Scénario 10 : Utilisateur mobile signale un problème
1. Connexion via Firebase
2. Sélection d’un point sur la carte
3. Ajout description et photos
4. Envoi du signalement

### Scénario 11 : Notification mobile
1. Le manager modifie le statut
2. Firebase envoie une notification
3. L’utilisateur la reçoit sur mobile

### Scénario 12 : Carte offline
1. Démarrage du serveur de cartes Docker
2. Chargement de la carte offline
3. Manipulation avec Leaflet
