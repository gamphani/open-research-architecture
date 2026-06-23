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
  const [minMaturity, setMinMaturity] = useState(0);
  
  // Sidebar state tracking the currently selected zone data
  const [selectedZone, setSelectedZone] = useState(null);

  // 1. Fetch filtered clinical sites from backend
  useEffect(() => {
    setLoading(true);
    axios.get(`http://127.0.0.1:8000/api/sites?min_maturity=${minMaturity}`)
      .then((response) => {
        setSites(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching sites:", error);
        setLoading(false);
      });
  }, [minMaturity]);

  // 2. Initialize map canvas and load MoH Zone Polygons
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [33.7, -13.5],
      zoom: 6.2
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Once the base map tiles load, inject our GeoJSON source and fill layer
    map.current.on('load', () => {
      axios.get('http://127.0.0.1:8000/api/zones')
        .then((response) => {
          // Add the vector source
          map.current.addSource('moh-zones', {
            type: 'geojson',
            data: response.data
          });

          // Add a shaded polygon fill layer
          map.current.addLayer({
            id: 'zone-fills',
            type: 'fill',
            source: 'moh-zones',
            layout: {},
            paint: {
              'fill-color': '#3b82f6',
              'fill-opacity': 0.12
            }
          });

          // Add clean outline borders for the zones
          map.current.addLayer({
            id: 'zone-borders',
            type: 'line',
            source: 'moh-zones',
            layout: {},
            paint: {
              'line-color': '#2563eb',
              'line-width': 1.5,
              'line-dasharray': [2, 2]
            }
          });

          // INTERACTION: Click listener for the vector polygons
          map.current.on('click', 'zone-fills', (e) => {
            if (e.features.length > 0) {
              const props = e.features[0].properties;
              // Parse back out our embedded array from string formats
              const districtsArray = typeof props.districts === 'string' 
                ? JSON.parse(props.districts) 
                : props.districts;

              setSelectedZone({
                name: props.zone_name,
                districts: districtsArray,
                hiv: props.hiv_rate,
                hypertension: props.hypertension_rate
              });
            }
          });

          // UI Comfort: Change cursor to pointer when hovering over a zone
          map.current.on('mouseenter', 'zone-fills', () => {
            map.current.getCanvas().style.cursor = 'pointer';
          });
          map.current.on('mouseleave', 'zone-fills', () => {
            map.current.getCanvas().style.cursor = '';
          });
        });
    });
  }, []);

  // 3. Programmatically paint markers when 'sites' data updates
  useEffect(() => {
    if (!map.current) return;

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

      const popup = new mapboxgl.Popup({ offset: 15, closeButton: true, closeOnClick: true }).setHTML(popupHTML);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (popup.isOpen()) popup.remove();
        else popup.setLngLat([site.longitude, site.latitude]).addTo(map.current);
      });

      const marker = new mapboxgl.Marker(el).setLngLat([site.longitude, site.latitude]).addTo(map.current);
      markersRef.current.push(marker);
    });
  }, [sites]);

  return (
    <div className="flex h-screen flex-col font-sans text-slate-800 bg-slate-50">
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

      {/* Main App Workplace */}
      <div className="flex flex-grow relative overflow-hidden">
        
        {/* Left Interactive Panel Layout */}
        <div className="absolute top-4 left-4 z-10 space-y-4 pointer-events-none">
          {/* Slider Controls */}
          <div className="bg-white/95 backdrop-blur p-5 rounded-xl shadow-xl border border-slate-200/80 w-80 pointer-events-auto">
            <h2 className="font-bold text-base text-slate-900 mb-1">Feasibility Controls</h2>
            <p className="text-[11px] text-slate-500 mb-4">Live query parameter routing to PostGIS</p>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-600">Min Digital Maturity</label>
                <span className="bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded text-[11px] border border-blue-100">
                  {minMaturity} / 100
                </span>
              </div>
              <input 
                type="range" min="0" max="100" value={minMaturity}
                onChange={(e) => setMinMaturity(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Health Zone Inspector Panel */}
          {selectedZone && (
            <div className="bg-slate-900/95 text-white p-5 rounded-xl shadow-xl w-80 pointer-events-auto border border-slate-800 animate-fadeIn">
              <div className="flex justify-between items-start border-b border-slate-800 pb-2 mb-3">
                <div>
                  <h3 className="font-bold text-base text-blue-400">{selectedZone.name}</h3>
                  <p className="text-[10px] text-slate-400">Official MoH Administrative Bounds</p>
                </div>
                <button onClick={() => setSelectedZone(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 tracking-wider block mb-1">Assigned Districts ({selectedZone.districts.length})</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedZone.districts.map((d) => (
                      <span key={d} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700/50">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-slate-800/60 p-2 rounded border border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 uppercase block">HIV Rate</span>
                    <strong className="text-sm font-bold text-red-400">{selectedZone.hiv}%</strong>
                  </div>
                  <div className="bg-slate-800/60 p-2 rounded border border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 uppercase block">Hypertension</span>
                    <strong className="text-sm font-bold text-yellow-400">{selectedZone.hypertension}%</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Syncing Indicators */}
        {loading && (
          <div className="absolute top-4 right-16 z-10 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-medium flex items-center gap-2 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            Querying stack...
          </div>
        )}
        
        {/* Core Canvas Element */}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
}