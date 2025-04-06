// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBsQCz6d18CZtZQKD1NH2rNzrjiiwqLThM",
  authDomain: "abdallah-bio.firebaseapp.com",
  projectId: "abdallah-bio",
  storageBucket: "abdallah-bio.firebasestorage.app",
  messagingSenderId: "598789674277",
  appId: "1:598789674277:web:18c136dd37f03b2f6a76cc",
  measurementId: "G-88CM5NQ696"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
