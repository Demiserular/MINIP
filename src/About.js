// src/About.js

import React, { useEffect } from "react";
import { gsap } from "gsap";
import "./About.css"; // Import the CSS file for styling

const About = () => {
  useEffect(() => {
    gsap.fromTo(".about-content", 
      { opacity: 0, y: 50 }, 
      { opacity: 1, y: 0, duration: 1.5, ease: "power2.out" }
    );
  }, []);

  return (
    <div className="about-container">
      <section className="about-content">
        <h2>About Netra</h2>
        <p>Welcome to Netra, a leader in innovative data solutions. Our mission is to provide cutting-edge technology for data deduplication and merging, ensuring your data is clean, efficient, and up-to-date. Our state-of-the-art systems are designed to handle complex datasets with ease, helping you make better data-driven decisions.</p>
        <p>At Netra, we are committed to delivering high-quality solutions with a focus on reliability and performance. Our team of experts is dedicated to continuous improvement and providing exceptional service to meet your data needs.</p>
      </section>
    </div>
  );
}

export default About;
