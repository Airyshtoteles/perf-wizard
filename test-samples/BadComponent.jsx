import React, { useState, useEffect } from 'react';
import lodash from 'lodash'; // Heavy import
import moment from 'moment'; // Heavy import

// Bad React component with performance issues
const BadComponent = ({ items, onUpdate }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Memory leak - no cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Polling...');
    }, 1000);
    
    document.addEventListener('click', handleClick);
    // Missing cleanup
  }, []);

  // Expensive operation in render
  const processedData = items.map(item => {
    // Nested loops - O(n²) complexity
    for (let i = 0; i < items.length; i++) {
      for (let j = 0; j < items.length; j++) {
        if (items[i].id === items[j].relatedId) {
          // Heavy computation in nested loop
          const result = lodash.debounce(() => {
            return moment().format('YYYY-MM-DD');
          }, 100)();
        }
      }
    }
    return item;
  });

  // Inline object creation (causes re-renders)
  const handleClick = (event) => {
    // DOM manipulation in event handler
    document.getElementById('target').innerHTML = 'Updated';
    
    // Missing event cleanup
    onUpdate({
      timestamp: new Date(),
      data: processedData
    });
  };

  // Inline style object (causes re-renders)
  return (
    <div style={{ marginTop: 20, padding: 10 }}>
      {loading && <div>Loading...</div>}
      {processedData.map((item, index) => (
        // Missing key optimization
        <div key={index} onClick={() => handleClick(item)}>
          {/* Inline function (causes re-renders) */}
          <span onClick={() => console.log('clicked')}>
            {item.name}
          </span>
        </div>
      ))}
    </div>
  );
};

export default BadComponent;
