# Projet Cloud S5 – Suivi des travaux routiers à Antananarivo

## 1. Présentation générale du projet

Ce projet Cloud, réalisé en groupe de 4 étudiants (Promotion 17), a pour objectif de concevoir une application complète permettant le **suivi des travaux et problèmes routiers dans la ville d’Antananarivo**.

Le système repose sur :

* une **API d’authentification**
* une **application Web**
* une **application Mobile**
* une **gestion cartographique**
* une **synchronisation des données en ligne et hors ligne**

L’ensemble doit être **dockerisé**, documenté, et publié sur un dépôt Git public.

---

## 2. Objectifs du projet

Les objectifs principaux sont :

* Mettre en place un **fournisseur d’identité (authentification)** sous forme d’API REST
* Développer une **application Web** pour la consultation et la gestion des travaux routiers
* Développer une **application Mobile** pour le signalement des problèmes sur le terrain
* Gérer la **synchronisation des données** entre une base locale et une base cloud
* Exploiter des **cartes géographiques** en mode hors ligne et en ligne

---

## 3. Architecture globale du système

Le système repose sur deux types de stockage de données :

* **PostgreSQL (local, dans Docker)**
  → Base de données principale (source de vérité)

* **Firebase (en ligne)**
  → Base de synchronisation pour l’application mobile

Les applications Web et Mobile consomment les données via l’API et Firebase selon leur contexte d’utilisation.

---

## 4. Module Authentification (API REST)

### 4.1 Objectif

Mettre en place une API REST servant de **fournisseur d’identité**, sans interface graphique.

### 4.2 Technologies autorisées

* Java
* Node.js
* .NET
* PHP MVC (sans FlightPHP)
* Docker
* PostgreSQL
* Firebase (si connexion Internet)

### 4.3 Fonctionnalités minimales

* Inscription utilisateur (email / mot de passe)
* Authentification
* Modification des informations utilisateur
* Gestion de la durée de vie des sessions
* Limitation des tentatives de connexion (paramétrable, par défaut 3)
* Blocage du compte après dépassement
* API REST permettant de débloquer un utilisateur
* Documentation complète de l’API via **Swagger**

---

## 5. Module Cartographie

### Objectif

Afficher et manipuler une carte de la ville d’Antananarivo.

### Fonctionnalités

* Installation d’un **serveur de cartes hors ligne** dans Docker
* Téléchargement de la carte d’Antananarivo avec les rues
* Utilisation de **Leaflet** pour l’affichage et la manipulation de la carte dans l’application Web

---

## 6. Application Web

### 6.1 Objectif

Permettre :

* aux **visiteurs** de consulter l’état des travaux routiers
* au **manager** de gérer et mettre à jour les données

### 6.2 Technologies

* React, Angular ou VueJS
* La technologie Web doit être **différente de celle utilisée pour le mobile**

### 6.3 Authentification

* Utilisation de l’API REST Authentification
* Création et connexion de compte

---

### 6.4 Profils utilisateurs

#### a) Visiteur (sans compte)

Fonctionnalités :

* Affichage de la carte avec les points représentant les problèmes routiers
* Affichage des informations au survol d’un point :

  * date
  * statut (nouveau, en cours, terminé)
  * surface (m²)
  * budget
  * entreprise concernée
* Tableau récapitulatif :

  * nombre total de points
  * surface totale
  * avancement global (%)
  * budget total

---

#### b) Manager (avec compte)

Fonctionnalités :

* Création de comptes utilisateurs
* Bouton de synchronisation avec Firebase
* Récupération des signalements depuis Firebase
* Envoi des données vers Firebase pour l’application mobile
* Déblocage des utilisateurs bloqués
* Gestion des informations des signalements :

  * surface
  * budget
  * entreprise
* Modification du statut des signalements

---

## 7. Application Mobile

### 7.1 Objectif

Permettre aux utilisateurs de **signaler les problèmes routiers directement sur le terrain**.

### 7.2 Technologies

* Ionic
* React / Angular / VueJS (différent de l’application Web)

### 7.3 Fonctionnalités

* Connexion via Firebase
* Inscription uniquement via le manager (application Web)
* Signalement des problèmes routiers à partir de la carte
* Utilisation de Leaflet et OpenStreetMap (en ligne)
* Géolocalisation
* Affichage de la carte et du récapitulatif
* Filtre : afficher uniquement mes signalements

---

## 8. Éléments d’évaluation

Les points suivants seront évalués :

* Fonctionnalités
* Qualité du code
* Design
* Suivi des tâches (outil de gestion de projet)
* APK de l’application mobile
* Documentation technique
* Gestion des imprévus (aléas)

---

## 9. Documentation technique attendue

La documentation doit contenir :

* Le MCD (Modèle Conceptuel de Données)
* Les scénarios d’utilisation avec captures d’écran
* La liste des membres du groupe :

  * Nom
  * Prénom
  * Numéro étudiant

---

## 10. Contraintes générales

* Code source publié sur GitHub ou GitLab (public)
* API sans interface graphique
* Utilisation de Docker
* Respect de la séparation Web / Mobile
* Confidentialité du projet

---

Confidential – Not for Public Consumption or Distribution
