import React, { createContext, useState, useEffect } from "react";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const DebankContext = createContext();

const DebankApiProvider = ({ children }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data from API
    fetch(`${API_URL}/debank`)
      .then((response) => response.json())
      .then((result) => setData(result))
      .catch((error) => console.error("Error:", error));
  }, []);

  return (
    <DebankContext.Provider value={data}>{children}</DebankContext.Provider>
  );
};

export default DebankApiProvider;
