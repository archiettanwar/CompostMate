import dotenv from "dotenv";
dotenv.config();
import { getCityTemperature } from "./src/lib/weather.js";
import { calculateCNRatio, calculateMaturity } from "./src/lib/algorithms.js";

const { temp } = await getCityTemperature("Mumbai");
console.log("Mumbai temp:", temp);

// Use temp as a stand-in CN ratio to verify maturity output changes
const maturity = calculateMaturity(temp);
console.log("Maturity result:", maturity);