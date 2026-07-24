import React, { useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';

function CatalogManager() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleDrag = function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = function(e) {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onUpload = () => {
    if (!selectedFile) return;
    alert(`Simulando subida de: ${selectedFile.name}`);
    // Here we would call the /api/templates endpoint
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Gestor de Catálogo y Plantillas</h2>
      
      <div className="form-canvas" style={{ minHeight: 'auto', padding: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Subir Nueva Plantilla Excel</h3>
        
        <div 
          className={`canvas-field ${dragActive ? 'selected' : ''}`}
          style={{ 
            height: '200px', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            textAlign: 'center',
            borderWidth: '2px'
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <UploadCloud size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          
          {selectedFile ? (
            <div>
              <p style={{ fontWeight: 500 }}>{selectedFile.name}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lista para subir</p>
            </div>
          ) : (
            <div>
              <p style={{ marginBottom: '0.5rem' }}>Arrastra y suelta tu archivo .xlsx aquí</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>o</p>
              <label style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }}>
                Selecciona un archivo
                <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleChange} />
              </label>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={onUpload}
            disabled={!selectedFile}
            style={{ opacity: selectedFile ? 1 : 0.5 }}
          >
            Subir Plantilla
          </button>
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Documentos Actuales</h3>
        <div className="draggable-item" style={{ cursor: 'default' }}>
          <FileText size={24} color="var(--secondary)" />
          <div>
            <div style={{ fontWeight: 500 }}>FRPS01 - Solicitud de Servicio Social</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Plantilla: plantillas/FRPS01.xlsx</div>
          </div>
        </div>
        <div className="draggable-item" style={{ cursor: 'default' }}>
          <FileText size={24} color="var(--secondary)" />
          <div>
            <div style={{ fontWeight: 500 }}>FRPS08 - Bases de Concertación</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Plantilla: plantillas/FRPS08.xlsx</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CatalogManager;
