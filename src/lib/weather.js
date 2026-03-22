// TODO: implement weather.js
import dotenv from "dotenv";
dotenv.config();

export async function getCityTemperature(city) {
  const apiKey = process.env.VITE_OPENWEATHER_API_KEY; // process.env works here
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Weather fetch failed: ${response.status}`);

  const data = await response.json();
  return {
    city: data.name,
    temp: data.main.temp,
    description: data.weather[0].description,
  };
}

// test call
getCityTemperature("Mumbai").then(console.log).catch(console.error);