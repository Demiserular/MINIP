import React, { useState } from 'react';
import axios from 'axios';

// Component function
const DatasetUploader = () => {
  const [datasets, setDatasets] = useState([
    { name: "file1.csv", size: 500, timestamp: "2024-09-18T10:30:00Z" },
    { name: "file1.csv", size: 600, timestamp: "2024-09-18T10:35:00Z" },
    { name: "file2.csv", size: 300, timestamp: "2024-09-17T09:20:00Z" }
  ]);

  // Function to send data to Flask backend
  const sendToBackend = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/deduplicate', datasets);
      console.log("Merged and Deduplicated Data:", response.data);
    } catch (error) {
      console.error("Error connecting to the backend:", error);
    }
  };

  return (
    <div>
      <h1>Dataset Uploader</h1>
      <button onClick={sendToBackend}>Send to Backend</button>
    </div>
  );
};

export default DatasetUploader;
