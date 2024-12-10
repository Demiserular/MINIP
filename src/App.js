import React, { useState, useEffect } from "react";
import { gsap } from "gsap";
import DatasetUploader from './DatasetUploader';
import axios from 'axios'; 
import Papa from "papaparse";
import "./App.css";

// Function to convert sizes to bytes for comparison (assuming MB, GB, etc.)
function parseSize(size) {
  const units = { MB: 1, GB: 1024 };
  const [value, unit] = size.split(/(\d+)/).filter(Boolean);
  return parseInt(value) * (units[unit] || 1); // Convert size to MB or GB
}

// Function to merge duplicates: Keeps the latest timestamp and largest size
function mergeDuplicates(data) {
  const mergedDatasets = {};

  data.forEach((dataset) => {
    const existingDataset = mergedDatasets[dataset.name];

    // If the dataset already exists, merge it
    if (existingDataset) {
      // Keep the largest size
      if (parseSize(dataset.size) > parseSize(existingDataset.size)) {
        existingDataset.size = dataset.size;
      }
      // Keep the latest timestamp
      if (new Date(dataset.timestamp) > new Date(existingDataset.timestamp)) {
        existingDataset.timestamp = dataset.timestamp;
      }
    } else {
      // If not exists, add the dataset to the mergedDatasets
      mergedDatasets[dataset.name] = { ...dataset };
    }
  });

  // Convert the object back to an array
  return Object.values(mergedDatasets);
}

const App = () => {
  const [repository, setRepository] = useState([]);
  const [userDownloads, setUserDownloads] = useState([]);
  const [alert, setAlert] = useState(null);
  const [isMerged, setIsMerged] = useState(false);
  const [importedData, setImportedData] = useState([]); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [newDataset, setNewDataset] = useState({
    name: "",
    size: "",
    timestamp: "",
  });
  const [isSidebarVisible, setSidebarVisible] = useState(false);

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setSidebarVisible(!isSidebarVisible);
    if (!isSidebarVisible) {
      gsap.to(".sidebar", { x: 0, duration: 0.5, ease: "powerv2.out" });
    } else {
      gsap.to(".sidebar", { x: "-100%", duration: 0.5, ease: "power2.in" });
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (alert) {
      gsap.fromTo(".alert-box", { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.8 });
    }
  }, [alert]);

  // Fetch initial repository from external JSON file
  useEffect(() => {
    fetch("/repositoryData.json")
      .then((response) => response.json())
      .then((data) => {
        const mergedData = mergeDuplicates(data);
        setRepository(mergedData);
      })
      .catch((error) => console.error("Error loading the repository data: ", error));
  }, []);

  const handleMergeDuplicates = async () => {
    const mergedData = mergeDuplicates(repository);  // Local merge
    const result = await sendToBackend(mergedData);  // Send merged data to backend
    setRepository(result);  // Update repository with result from backend
    setIsMerged(true);  // Mark as merged
  };

  const checkDuplicate = (dataset) => {
    const duplicate = repository.find((data) => data.name === dataset.name);

    if (duplicate) {
      setAlert(duplicate);
      gsap.fromTo(".alert-box", { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 1 });
    } else {
      setUserDownloads([...userDownloads, dataset]);
      setRepository([...repository, dataset]); // Add dataset to the central repository
    }
  };

  const handleDownload = (name) => {
    const dataset = { name, size: "300MB", timestamp: new Date().toISOString().split("T")[0] };
    checkDuplicate(dataset);
  };

  const sendToBackend = async (mergedData) => {
    try {
      const response = await axios.post('/api/merge', mergedData);
      return response.data;
    } catch (error) {
      console.error('Error sending data to backend:', error);
      return mergedData;
    }
  };

  const handleAddDataset = (e) => {
    e.preventDefault();
    if (newDataset.name && newDataset.size && newDataset.timestamp) {
      checkDuplicate(newDataset);
      setNewDataset({ name: "", size: "", timestamp: "" }); // Reset form
    }
  };

  const handleDelete = (datasetName) => {
    setUserDownloads(userDownloads.filter((dataset) => dataset.name !== datasetName));
  };

  const handleDeleteFromRepository = (datasetName, index) => {
    gsap.to(`.repository li:nth-child(${index + 1})`, {
      opacity: 0,
      x: 100,
      duration: 0.5,
      onComplete: () => {
        setRepository(repository.filter((dataset, i) => i !== index));
      },
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const fileContent = e.target.result;

        if (file.name.endsWith('.csv')) {
          Papa.parse(fileContent, {
            header: true,
            complete: (results) => {
              const data = results.data;
              const headers = results.meta.fields || Object.keys(data[0] || {});
              setImportedData({ data, headers });
            },
          });
        } else if (file.name.endsWith('.json')) {
          try {
            const jsonData = JSON.parse(fileContent);
            const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
            setImportedData({ data: jsonData, headers });
          } catch (error) {
            console.error('Invalid JSON file');
          }
        }
      };

      reader.readAsText(file);
    }
  };

  const triggerFileInput = () => {
    document.querySelector('.file-input').click();
    gsap.fromTo(".file-upload-container", { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" });
  };

return (
  <div className="ddas-container">
    <header>
      <h1>NETRA DDAS</h1>
      
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarVisible ? 'visible' : ''}`}>
        <nav>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#downloads">Downloads</a></li>
            <li><a href="#repository">Repository</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      </div>
      
      {/* Menu Icon for Sidebar (Hamburger Menu) */}
      <button className={`menu-icon ${isSidebarVisible ? 'menu-open' : ''}`} onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      {/* Dark Mode Toggle Button */}
      <button className="dark-mode-toggle" onClick={toggleDarkMode}>
        {isDarkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
      </button>
    </header>

    {/* File Upload */}
    <div className="file-upload-container">
      <h3>Import Datasets</h3>
      <input
        type="file"
        accept=".csv, .json"
        onChange={handleFileUpload}
        className="file-input"
      />
      <button onClick={triggerFileInput} className="upload-button">
        Upload File
      </button>
    </div>

    {/* Imported Data Display */}
    <div>
      {importedData && (
        <div className="imported-data">
          <h3>Imported Data:</h3>
          {importedData.data && importedData.data.length > 0 ? (
            <table className="imported-data-table">
              <thead>
                <tr>
                  {importedData.headers.map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importedData.data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {importedData.headers.map((header, headerIndex) => (
                      <td key={headerIndex}>{row[header] || 'N/A'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>Please upload the data first!</p>
          )}
        </div>
      )}
    </div>

    {/* Horizontal Box Cards */}
    <section className="box-cards-container">
      <div className="box-card">
        <h3>Duplication Removal</h3>
        <p>Our system detects duplicate datasets and automatically removes them.</p>
      </div>
      <div className="box-card">
        <h3>Merging Data</h3>
        <p>Merge multiple datasets while preserving the integrity of the largest files.</p>
      </div>
      <div className="box-card">
        <h3>Deduplication</h3>
        <p>Efficiently deduplicate your data using advanced algorithms.</p>
      </div>
    </section>

    {/* Dataset Download Buttons */}
    <div className="App-container">
      <h1>Data Download Duplication Alert System (DDAS)</h1>

      <div className="datasets">
        <button onClick={() => handleDownload("Climate Data 2020")}>
          Download Climate Data 2020
        </button>
        <button onClick={() => handleDownload("Ocean Data 2021")}>
          Download Ocean Data 2021
        </button>
        <button onClick={() => handleDownload("Earthquake Data 2019")}>
          Download Earthquake Data 2019
        </button>
      </div>

      {/* Duplicate Download Alert */}
      {alert && (
        <div className="alert-box">
          <h2>Duplicate Download Alert</h2>
          <p>The dataset <strong>{alert.name}</strong> was already downloaded.</p>
          <p>Size: {alert.size}</p>
          <p>Downloaded on: {alert.timestamp}</p>
          <button onClick={() => setAlert(null)}>Close</button>
        </div>
      )}

      {/* User Downloads */}
      <div className="user-downloads">
        <h3>Your Downloads:</h3>
        <ul>
          {userDownloads.map((download, index) => (
            <li key={index}>
              {download.name} - {download.size}
              <button onClick={() => handleDelete(download.name)}>Delete</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Repository Table */}
      <div id="repository" className="repository">
        <h3>Repository Datasets:</h3>
        <table className="repository-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>Size</th>
              <th>Timestamp</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {repository.map((dataset, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{dataset.name}</td>
                <td>{dataset.size}</td>
                <td>{dataset.timestamp}</td>
                <td>
                  <button onClick={() => handleDeleteFromRepository(dataset.name, index)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="App">
      <DatasetUploader />
    </div>

      {/* Add New Dataset Form */}
      <div className="add-dataset-form">
        <h3>Add a New Dataset:</h3>
        <form onSubmit={handleAddDataset}>
          <input
            type="text"
            placeholder="Dataset Name"
            value={newDataset.name}
            onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Size (e.g., 400MB)"
            value={newDataset.size}
            onChange={(e) => setNewDataset({ ...newDataset, size: e.target.value })}
          />
          <input
            type="date"
            value={newDataset.timestamp}
            onChange={(e) => setNewDataset({ ...newDataset, timestamp: e.target.value })}
          />
          <button type="submit">Add Dataset</button>
        </form>
      </div>

      {/* Merge and Deduplication Button */}
      <div className="deduplication-button-container">
        <button className="merge-button" onClick={handleMergeDuplicates} disabled={isMerged}>
          {isMerged ? "Data Merged" : "Deduplicate Merge Data"}
        </button>
      </div>

      {/* Merge Icon Button */}
      <div className="merge-icon-container">
        <button className="merge-icon" onClick={handleMergeDuplicates} disabled={isMerged}>
          {isMerged ? "✓" : "+"}
        </button>
      </div>

      {/* Footer */}
      <footer>
        <p>&copy; 2024 Netra Company. All rights reserved.</p>
      </footer>
    </div>
  </div>
);

}
export default App;
