import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import axios from 'axios';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State tracking our dynamic range filter threshold
  const [minMaturity, setMinMaturity] = useState(0);

  // 1. Fetch data from FastAPI backend - dependent on minMaturity state
  useEffect(() => {
    setLoading(true);
    axios.get(`http://127.0.0.1:8000/api/sites?min_maturity=${minMaturity}`)
      .then((response) => {
        setSites(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, [minMaturity]); // Triggers database query whenever slider updates!

  // 2. Initialize the physical Mapbox canvas once
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [33.7, -13.5],
      zoom: 6.5
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
  }, []);

  // 3. Programmatically paint markers when 'sites' data updates
  useEffect(() => {
    if (!map.current) return;

    // Wipe stale markers from the map layout cleanly on state shifts
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    sites.forEach((site) => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer'; 

      const inner = document.createElement('div');
      inner.className = 'w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold transition-transform duration-200 hover:scale-125';
      
      if (site.maturity_score > 70) inner.classList.add('bg-green-500');
      else if (site.maturity_score > 40) inner.classList.add('bg-yellow-500');
      else inner.classList.add('bg-red-500');

      inner.innerHTML = '•';
      el.appendChild(inner);

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

      const popup = new mapboxgl.Popup({ 
        offset: 15,
        closeButton: true,
        closeOnClick: true 
      }).setHTML(popupHTML);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (popup.isOpen()) {
          popup.remove();
        } else {
          popup.setLngLat([site.longitude, site.latitude]).addTo(map.current);
        }
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([site.longitude, site.latitude])
        .addTo(map.current);

      markersRef.current.push(marker);
    });
  }, [sites]);

  return (
    <div className="flex h-screen flex-col font-sans text-slate-800">
      {/* Top Banner Navigation */}
      <header className="bg-slate-900 px-6 py-4 text-white shadow-md z-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-wide">GeoNode Research Architecture</h1>
          <p className="text-sm text-slate-400">Site Feasibility & Digital Maturity Explorer</p>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300">
          Active Sites: <span className="font-bold text-green-400">{sites.length}</span>
        </div>
      </header>

      {/* Map Content Wrapper */}
      <div className="flex-grow relative w-full h-full">
        {/* Floating Interactive Filter Dashboard Component Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur p-6 rounded-xl shadow-xl border border-slate-200/80 w-80">
          <h2 className="font-bold text-lg text-slate-900 mb-1">Feasibility Controls</h2>
          <p className="text-xs text-slate-500 mb-4">Query criteria passed directly to PostGIS engine</p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <label className="font-semibold text-slate-700">Min Digital Maturity</label>
              <span className="bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded text-xs border border-blue-100">
                {minMaturity} / 100
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={minMaturity}
              onChange={(e) => setMinMaturity(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
              <span>0 (All Sites)</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Loading Overlay Spinner feedback */}
        {loading && (
          <div className="absolute top-4 right-16 z-10 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-medium tracking-wide flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            Syncing PostGIS filters...
          </div>
        )}
        
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}