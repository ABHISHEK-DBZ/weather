import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function ProfileForm({ onSave }) {
  const [formData, setFormData] = useState({
    city: '',
    cropType: 'Wheat',
    growthStage: 'vegetative',
    farmSize: 10,
    irrigationMethod: 'drip',
    language: 'English',
    alertChannel: 'in-app'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.city.trim()) {
      alert("Please enter a farm location (city)!");
      return;
    }
    onSave(formData);
  };

  return (
    <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} style={{
      background: 'rgba(15,23,42,0.9)', padding: 24, borderRadius: 20, maxWidth: 400, width: '100%',
      color: 'white', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', pointerEvents: 'auto'
    }}>
      <h2 style={{marginTop:0, fontSize: 20}}>🌱 Farm Profile Setup</h2>
      <p style={{fontSize: 13, opacity: 0.7, marginBottom: 20}}>Please tell us about your farm for tailored agricultural weather insights.</p>
      
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: 12}}>
        <label>
          <div style={{fontSize: 12, opacity: 0.8, marginBottom: 4}}>Farm Location (City / District)</div>
          <input value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} style={inputStyle} placeholder="e.g. Pune, Fresno" required />
        </label>
        <label>
          <div style={{fontSize: 12, opacity: 0.8, marginBottom: 4}}>Crop Type</div>
          <input value={formData.cropType} onChange={e=>setFormData({...formData, cropType: e.target.value})} style={inputStyle} placeholder="e.g. Cotton, Tomatoes" required />
        </label>
        <label>
          <div style={{fontSize: 12, opacity: 0.8, marginBottom: 4}}>Growth Stage</div>
          <select value={formData.growthStage} onChange={e=>setFormData({...formData, growthStage: e.target.value})} style={inputStyle}>
            <option value="pre-sowing">Pre-sowing</option>
            <option value="sowing">Sowing</option>
            <option value="vegetative">Vegetative</option>
            <option value="flowering">Flowering</option>
            <option value="harvest-ready">Harvest-ready</option>
          </select>
        </label>
        <div style={{display: 'flex', gap: 10}}>
          <label style={{flex: 1}}>
            <div style={{fontSize: 12, opacity: 0.8, marginBottom: 4}}>Size (Acres)</div>
            <input type="number" min="1" value={formData.farmSize} onChange={e=>setFormData({...formData, farmSize: e.target.value})} style={inputStyle} required />
          </label>
          <label style={{flex: 1}}>
            <div style={{fontSize: 12, opacity: 0.8, marginBottom: 4}}>Irrigation</div>
            <select value={formData.irrigationMethod} onChange={e=>setFormData({...formData, irrigationMethod: e.target.value})} style={inputStyle}>
              <option value="rainfed">Rainfed</option>
              <option value="drip">Drip</option>
              <option value="sprinkler">Sprinkler</option>
              <option value="flood">Flood</option>
            </select>
          </label>
        </div>
        <label>
          <div style={{fontSize: 12, opacity: 0.8, marginBottom: 4}}>Language</div>
          <select value={formData.language} onChange={e=>setFormData({...formData, language: e.target.value})} style={inputStyle}>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Marathi">Marathi</option>
          </select>
        </label>
        
        <button type="submit" style={{
          marginTop: 10, padding: '12px', borderRadius: 12, border: 'none', background: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s'
        }}>Save Profile & Continue</button>
      </form>
    </motion.div>
  );
}

const inputStyle = {
  width: '100%', padding: 10, boxSizing: 'border-box', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: 14, outline: 'none'
};
