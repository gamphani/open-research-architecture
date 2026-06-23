import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set the global token for the vanilla core library
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function App() {
  const mapContainer = useRef(null); // Reference to HTML element
  const map = useRef(null);          // Reference to underlying Mapbox instance
  const markersRef = useRef([]);     // Array to track active map markers
  
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch data from FastAPI backend
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/sites')
      .then((response) => {
        setSites(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, []);

  // 2. Initialize the physical Mapbox map canvas once
  useEffect(() => {
    if (map.current) return; // Prevent double rendering in development

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [33.7, -13.5], // Coordinates over Central Africa/Malawi
      zoom: 6.5
    });

    // Add zoom and rotation controls to the map UI
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
  }, []);

  // 3. Programmatically paint markers when 'sites' data updates
  useEffect(() => {
    if (!map.current || sites.length === 0) return;

    // Clear existing markers from memory if data re-fetches
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    sites.forEach((site) => {
      // Outer wrapper element - purely for Mapbox to anchor positions securely
      const el = document.createElement('div');
      el.className = 'cursor-pointer'; 

      // INNER child element - handles all styling and hover scale animations safely
      const inner = document.createElement('div');
      inner.className = 'w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold transition-transform duration-200 hover:scale-125';
      
      // Color coding logic applied to the inner element
      if (site.maturity_score > 70) inner.classList.add('bg-green-500');
      else if (site.maturity_score > 40) inner.classList.add('bg-yellow-500');
      else inner.classList.add('bg-red-500');

      inner.innerHTML = '•';
      
      // Nest the stylized pin inside the stable coordinate element
      el.appendChild(inner);

      // Design the popup card markup template
      const popupHTML = `
        <div class="p-2 text-slate-800 font-sans">
          <h3 class="font-bold text-base border-b pb-1 mb-2">${site.name}</h3>
          <p class="text-xs text-slate-500 font-medium mb-2">${site.facility_type}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px;">
            <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; text-align: center;">
              <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase; display: block;">Maturity</span>
              <strong style="font-size: 14px; color: #334155;">${site.maturity_score}/100</strong>
            </div>
            <div style="font-size: 11px; display: flex; flex-direction: column; justify-content: center;">
              <div>• ${site.has_emr ? site.emr_vendor : 'No EMR'}</div>
              <div>• ${site.has_reliable_internet ? 'Internet OK' : 'Offline'}</div>
            </div>
          </div>
        </div>
      `;

      // Build out the dynamic popup configuration block
      const popup = new mapboxgl.Popup({ 
        offset: 15,
        closeButton: true,
        closeOnClick: true 
      }).setHTML(popupHTML);

      // Attach listener directly to the outer container element
      el.addEventListener('click', (e) => {
        // Prevent click events from reaching the map and triggering close methods
        e.stopPropagation();
        
        if (popup.isOpen()) {
          popup.remove();
        } else {
          popup.setLngLat([site.longitude, site.latitude]).addTo(map.current);
        }
      });

      // Create the native marker utilizing the nested HTML blueprint
      const marker = new mapboxgl.Marker(el)
        .setLngLat([site.longitude, site.latitude])
        .addTo(map.current);

      // Cache the marker reference for future cleanups
      markersRef.current.push(marker);
    });
  }, [sites]);

  return (
    <div className="flex h-screen flex-col font-sans">
      {/* Top Banner Navigation */}
      <header className="bg-slate-900 px-6 py-4 text-white shadow-md z-10">
        <h1 className="text-2xl font-bold tracking-wide">GeoNode Research Architecture</h1>
        <p className="text-sm text-slate-400">Site Feasibility & Digital Maturity Explorer</p>
      </header>

      {/* Map Target Canvas Wrapper */}
      <div className="flex-grow relative w-full h-full">
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center text-lg font-semibold text-slate-700">
            Streaming Clinical Coordinates...
          </div>
        )}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}