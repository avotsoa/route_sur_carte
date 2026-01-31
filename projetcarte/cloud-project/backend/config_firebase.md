// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCB3b8hY5AAc1CKFl_XlWiMi11lL5cfkQI",
  authDomain: "cloud-79a30.firebaseapp.com",
  projectId: "cloud-79a30",
  storageBucket: "cloud-79a30.firebasestorage.app",
  messagingSenderId: "918684403369",
  appId: "1:918684403369:web:76d51a45f9722671decbb8",
  measurementId: "G-QWFCYTQ825"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);