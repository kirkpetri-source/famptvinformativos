import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ProvedorAuth } from './hooks/useAuth.jsx';
import { ProvedorToast } from './hooks/useToast.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProvedorToast>
        <ProvedorAuth>
          <App />
        </ProvedorAuth>
      </ProvedorToast>
    </BrowserRouter>
  </React.StrictMode>
);
